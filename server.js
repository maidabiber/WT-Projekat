const express = require('express');
const cors = require('cors');
const { Scenario, Line, Delta, Checkpoint, sequelize } = require('./modeli');
const { Op } = require('sequelize');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let locks = { lines: {}, characters: {} };

function brojRijeci(tekst) {
    const rijeci = tekst.match(/[a-zčćžšđA-ZČĆŽŠĐ]+/g);
    return rijeci ? rijeci.length : 0;
}

function wrapText(text) {
    const cleanText = text
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleanText === "") return [""];
    const totalWords = brojRijeci(cleanText);

    if (totalWords <= 20) return [cleanText];

    const words = cleanText.match(/[a-zčćžšđA-ZČĆŽŠĐ]+/g);
    if (!words || words.length === 0) return [cleanText];

    const wordPositions = [];
    let searchPos = 0;
    words.forEach(word => {
        const regex = new RegExp(word, 'i');
        const match = cleanText.substring(searchPos).match(regex);
        if (match) {
            const startPos = searchPos + match.index;
            const endPos = startPos + word.length;
            wordPositions.push({ word, start: startPos, end: endPos });
            searchPos = endPos;
        }
    });

    const lines = [];
    let currentWordIndex = 0;
    while (currentWordIndex < words.length) {
        const endWordIndex = Math.min(currentWordIndex + 20, words.length);
        const startPos = wordPositions[currentWordIndex].start;
        const endPos = wordPositions[endWordIndex - 1].end;
        let lineText = cleanText.substring(startPos, endPos).trim();
        lines.push(lineText);
        currentWordIndex = endWordIndex;
    }
    return lines;
}

function processNewText(textArray) {
    const allLines = [];
    textArray.forEach((text) => {
        const wrapped = wrapText(text);
        allLines.push(...wrapped);
    });
    return allLines;
}


// kreiranje novog scenarija
app.post('/api/scenarios', async (req, res) => {
    try {
        const title = req.body.title && req.body.title.trim() !== '' 
            ? req.body.title 
            : "Neimenovani scenarij";
        
        const noviScenario = await Scenario.create({ title });
        const prvaLinija = await Line.create({
            lineId: 1,
            text: "",
            nextLineId: null,
            scenarioId: noviScenario.id
        });
        
        res.status(200).json({
            id: noviScenario.id,
            title: noviScenario.title,
            content: [{
                lineId: prvaLinija.lineId,
                nextLineId: prvaLinija.nextLineId,
                text: prvaLinija.text
            }]
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// zaključavanje linije
app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const lId = parseInt(req.params.lineId);
        const uId = parseInt(req.body.userId);

        const scenario = await Scenario.findByPk(sId, { include: [Line] });
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

      
        const lineExists = scenario.Lines.find(l => l.lineId === lId);
        if (!lineExists) {
            return res.status(404).json({ message: "Linija ne postoji!" });
        }

        for (let user in locks.lines) {
            if (locks.lines[user].scenarioId === sId && 
                locks.lines[user].lineId === lId && 
                parseInt(user) !== uId) {
                return res.status(409).json({ message: "Linija je vec zakljucana!" });
            }
        }

         if (locks.lines[uId] && 
            !(locks.lines[uId].scenarioId === sId && locks.lines[uId].lineId === lId)) {
            delete locks.lines[uId];
        }

        locks.lines[uId] = { scenarioId: sId, lineId: lId };
        res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// azuriranje linije
app.put('/api/scenarios/:scenarioId/lines/:lineId', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const lId = parseInt(req.params.lineId);
        const { userId, newText } = req.body;

         const scenario = await Scenario.findByPk(sId, { include: [Line] });
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

         if (!Array.isArray(newText) || newText.length === 0) {
            return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });
        }
  const targetLine = scenario.Lines.find(l => l.lineId === lId);
        if (!targetLine) {
            return res.status(404).json({ message: "Linija ne postoji!" });
        }

        
        const userLock = locks.lines[userId];
        if (!userLock || userLock.scenarioId != sId || userLock.lineId != lId) {
            return res.status(409).json({ message: "Linija nije zakljucana!" });
        }

        const processedLines = processNewText(newText);
        const originalNext = targetLine.nextLineId;
        const ts = Math.floor(Date.now() / 1000);

        let currentMax = Math.max(...scenario.Lines.map(l => l.lineId));

  
        let toDelete = [];
        let curr = targetLine;
        while (curr) {
            toDelete.push(curr.id);
            const nextLine = scenario.Lines.find(l => l.lineId === curr.nextLineId);
            curr = nextLine;
        }
        await Line.destroy({ where: { id: toDelete } });

        for (let i = 0; i < processedLines.length; i++) {
            const currentLineId = (i === 0) ? lId : ++currentMax;
            const nextId = (i === processedLines.length - 1) ? originalNext : (currentMax + 1);

            await Line.create({
                lineId: currentLineId,
                text: processedLines[i],
                nextLineId: nextId,
                scenarioId: sId
            });

            await Delta.create({
                scenarioId: sId,
                type: 'line_update',
                lineId: currentLineId,
                nextLineId: nextId,
                content: processedLines[i],
                timestamp: ts
            });
        }

        delete locks.lines[userId];
        res.status(200).json({ message: "Linija je uspjesno azurirana!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// zakljucavanje imena lika
app.post('/api/scenarios/:scenarioId/characters/lock', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const { userId, characterName } = req.body;

         const scenario = await Scenario.findByPk(sId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        if (!locks.characters[sId]) {
            locks.characters[sId] = {};
        }

        if (locks.characters[sId][characterName] && 
            locks.characters[sId][characterName] !== userId) {
            return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
        }

        locks.characters[sId][characterName] = userId;
        res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// azuriranje imena lika
app.post('/api/scenarios/:scenarioId/characters/update', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const { userId, oldName, newName } = req.body;

        const scenario = await Scenario.findByPk(sId, { include: [Line] });
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }
   for (let line of scenario.Lines) {
            if (line.text && line.text.includes(oldName)) {
                line.text = line.text.split(oldName).join(newName);
                await line.save();
            }
        }

      
        if (locks.characters[sId]) {
            delete locks.characters[sId][oldName];
        }

        await Delta.create({
            scenarioId: sId,
            type: "char_rename",
            oldName: oldName,
            newName: newName,
            timestamp: Math.floor(Date.now() / 1000)
        });

        res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// dohvatanje delti
app.get('/api/scenarios/:scenarioId/deltas', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const since = parseInt(req.query.since) || 0;
  const scenario = await Scenario.findByPk(sId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        const deltas = await Delta.findAll({
            where: {
                scenarioId: sId,
                timestamp: { [Op.gt]: since }
            },
            order: [['timestamp', 'ASC']],
            attributes: { exclude: ['id', 'scenarioId'] }
        });

        res.status(200).json({ deltas });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// dohvatanje scenarija
app.get('/api/scenarios/:scenarioId', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        
        const scenario = await Scenario.findByPk(sId, {
            include: [{
                model: Line,
                attributes: ['lineId', 'nextLineId', 'text']
            }]
        });

        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: scenario.Lines
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

//kreiranje checkpointa
app.post('/api/scenarios/:scenarioId/checkpoint', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        
        const scenario = await Scenario.findByPk(sId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        await Checkpoint.create({
            scenarioId: sId,
            timestamp: Math.floor(Date.now() / 1000)
        });

        res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// lista checkpointa
app.get('/api/scenarios/:scenarioId/checkpoints', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        
        const scenario = await Scenario.findByPk(sId);
        if (!scenario) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

        const checkpoints = await Checkpoint.findAll({
            where: { scenarioId: sId },
            attributes: ['id', 'timestamp'],
            order: [['timestamp', 'ASC']]
        });

        res.status(200).json(checkpoints);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// restore scenarija
app.get('/api/scenarios/:scenarioId/restore/:checkpointId', async (req, res) => {
    try {
        const sId = parseInt(req.params.scenarioId);
        const cpId = parseInt(req.params.checkpointId);

        const scenario = await Scenario.findByPk(sId);
        const checkpoint = await Checkpoint.findByPk(cpId);

        if (!scenario || !checkpoint) {
            return res.status(404).json({ message: "Scenario ne postoji!" });
        }

         const deltas = await Delta.findAll({
            where: {
                scenarioId: sId,
                timestamp: { [Op.lte]: checkpoint.timestamp }
            },
            order: [['timestamp', 'ASC'], ['id', 'ASC']]
        });

        let state = [{ lineId: 1, text: "", nextLineId: null }];

        deltas.forEach(d => {
            if (d.type === 'line_update') {
                let idx = state.findIndex(l => l.lineId === d.lineId);
                if (idx !== -1) {
                    state[idx].text = d.content;
                    state[idx].nextLineId = d.nextLineId;
                } else {
                    state.push({
                        lineId: d.lineId,
                        text: d.content,
                        nextLineId: d.nextLineId
                    });
                }
            } else if (d.type === 'char_rename') {
                state.forEach(l => {
                    if (l.text) {
                        l.text = l.text.split(d.oldName).join(d.newName);
                    }
                });
            }
        });

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: state
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
sequelize.sync({ force: true }).then(async () => {
    
    const pocetniScenario = {
        id: 1,
        title: "Potraga za izgubljenim ključem",
        content: [
            { lineId: 1, nextLineId: 2, text: "NARATOR: Sunce je polako zalazilo nad starim gradom." },
            { lineId: 2, nextLineId: 3, text: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?" },
            { lineId: 3, nextLineId: 4, text: "BOB: To je posljednje mjesto gdje sam ga vidio." },
            { lineId: 4, nextLineId: 5, text: "ALICE: Moramo požuriti." },
            { lineId: 5, nextLineId: 6, text: "BOB: Čekaj, čuješ li taj zvuk?" },
            { lineId: 6, nextLineId: null, text: "NARATOR: Iz sjene se pojavila figura." }
        ]
    };

    const delteZaUbacivanje = [
        { scenarioId: 1, type: "line_update", lineId: 1, nextLineId: 2, content: "NARATOR: Sunce je polako zalazilo nad starim gradom.", timestamp: 1736520000 },
        { scenarioId: 1, type: "line_update", lineId: 2, nextLineId: 3, content: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?", timestamp: 1736520010 },
        { scenarioId: 1, type: "line_update", lineId: 3, nextLineId: 4, content: "BOB: To je posljednje mjesto gdje sam ga vidio prije nego što je pala noć.", timestamp: 1736520020 },
        { scenarioId: 1, type: "line_update", lineId: 4, nextLineId: 5, content: "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata.", timestamp: 1736520030 },
        { scenarioId: 1, type: "line_update", lineId: 5, nextLineId: 6, content: "BOB: Čekaj, čuješ li taj zvuk iza polica?", timestamp: 1736520040 },
        { scenarioId: 1, type: "line_update", lineId: 6, nextLineId: null, content: "NARATOR: Iz sjene se polako pojavila nepoznata figura.", timestamp: 1736520050 },
        { scenarioId: 1, type: "char_rename", oldName: "BOB", newName: "ROBERT", timestamp: 1736520100 }
    ];

    try {
        
        const s = await Scenario.create({ 
            id: pocetniScenario.id, 
            title: pocetniScenario.title 
        });
        
          const linije = pocetniScenario.content.map(l => ({ 
            lineId: l.lineId,
            nextLineId: l.nextLineId,
            text: l.text,
            scenarioId: s.id 
        }));
        await Line.bulkCreate(linije);

        const delte = delteZaUbacivanje.map(d => ({ 
            scenarioId: s.id,
            type: d.type,
            lineId: d.lineId || null,
            nextLineId: d.nextLineId || null,
            oldName: d.oldName || null,
            newName: d.newName || null,
            content: d.content || null,
            timestamp: d.timestamp
        }));
        await Delta.bulkCreate(delte);

        console.log("Baza inicijalizovana sa testnim podacima.");
        
        app.listen(PORT, () => {
            console.log(`Server pokrenut na http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Greška pri inicijalizaciji baze:", err);
    }
});