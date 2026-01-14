const cors = require('cors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const PORT = 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const DATA_DIR = path.join(__dirname, 'data');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const DELTAS_FILE = path.join(DATA_DIR, 'deltas.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(SCENARIOS_DIR)) fs.mkdirSync(SCENARIOS_DIR);
if (!fs.existsSync(DELTAS_FILE)) fs.writeFileSync(DELTAS_FILE, '[]');

let locks = { lines: {}, characters: {} };
let scenarioIdCounter = 1;

function initializeCounters() {
    if (fs.existsSync(SCENARIOS_DIR)) {
        const files = fs.readdirSync(SCENARIOS_DIR);
        files.forEach(file => {
            if (file.startsWith('scenario-') && file.endsWith('.json')) {
                const id = parseInt(file.match(/scenario-(\d+)\.json/)[1]);
                if (id >= scenarioIdCounter) scenarioIdCounter = id + 1;
            }
        });
    }
}
initializeCounters();

const getScenarioPath = (id) => path.join(SCENARIOS_DIR, `scenario-${id}.json`);
const scenarioExists = (id) => fs.existsSync(getScenarioPath(id));
const readScenario = (id) => JSON.parse(fs.readFileSync(getScenarioPath(id), 'utf8'));
const writeScenario = (id, data) => fs.writeFileSync(getScenarioPath(id), JSON.stringify(data, null, 2));
const readDeltas = () => JSON.parse(fs.readFileSync(DELTAS_FILE, 'utf8'));

function addDelta(delta) {
    const deltas = readDeltas();
    deltas.push(delta);
    fs.writeFileSync(DELTAS_FILE, JSON.stringify(deltas, null, 2));
}

function getMaxLineId(scenario) {
    let maxId = 0;
    scenario.content.forEach(l => { if (l.lineId > maxId) maxId = l.lineId; });
    return maxId;
}

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

app.post('/api/scenarios', (req, res) => {
    const title = req.body.title && req.body.title.trim() !== '' ? req.body.title : "Neimenovani scenarij";
    const id = scenarioIdCounter++;
    const scenario = {
        id: id,
        title: title,
        content: [{ lineId: 1, nextLineId: null, text: "" }]
    };
    writeScenario(id, scenario);
    res.status(200).json(scenario);
});

app.post('/api/scenarios/:scenarioId/lines/:lineId/lock', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    const lId = parseInt(req.params.lineId);
    const uId = parseInt(req.body.userId);
    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    const scenario = readScenario(sId);
    if (!scenario.content.find(l => l.lineId === lId)) return res.status(404).json({ message: "Linija ne postoji!" });

    for (let user in locks.lines) {
        if (locks.lines[user].scenarioId === sId && locks.lines[user].lineId === lId && parseInt(user) !== uId) {
            return res.status(409).json({ message: "Linija je vec zakljucana!" });
        }
    }
    if (locks.lines[uId] && !(locks.lines[uId].scenarioId === sId && locks.lines[uId].lineId === lId)) {
        delete locks.lines[uId];
    }
    locks.lines[uId] = { scenarioId: sId, lineId: lId };
    res.status(200).json({ message: "Linija uspjesno zakljucana!" });
});

app.put('/api/scenarios/:scenarioId/lines/:lineId', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    const lId = parseInt(req.params.lineId);
    const { userId, newText } = req.body;

    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    if (!Array.isArray(newText) || newText.length === 0) return res.status(400).json({ message: "Niz ne smije biti prazan!" });

    let scenario = readScenario(sId);
    let idx = scenario.content.findIndex(l => l.lineId === lId);
    if (idx === -1) return res.status(404).json({ message: "Linija ne postoji!" });

    const userLock = locks.lines[userId];
    if (!userLock || userLock.scenarioId !== sId || userLock.lineId !== lId) {
        return res.status(409).json({ message: "Linija nije zakljucana!" });
    }

    const processedLines = processNewText(newText);
    const originalNext = scenario.content[idx].nextLineId;
    let currentMax = getMaxLineId(scenario);
    const ts = Math.floor(Date.now() / 1000);

    const newObjs = processedLines.map((txt, i) => ({
        lineId: i === 0 ? lId : ++currentMax,
        text: txt,
        nextLineId: null
    }));

    for (let i = 0; i < newObjs.length; i++) {
        newObjs[i].nextLineId = (i === newObjs.length - 1) ? originalNext : newObjs[i + 1].lineId;
        addDelta({
            scenarioId: sId,
            type: 'line_update',
            lineId: newObjs[i].lineId,
            nextLineId: newObjs[i].nextLineId,
            content: newObjs[i].text,
            timestamp: ts
        });
    }

    const lineMap = new Map(scenario.content.map(l => [l.lineId, l]));
    let removeIds = [];
    let cur = lId;
    while (cur !== null && lineMap.has(cur)) {
        removeIds.push(cur);
        cur = lineMap.get(cur).nextLineId;
    }
    scenario.content = scenario.content.filter(l => !removeIds.includes(l.lineId));
    scenario.content.splice(idx, 0, ...newObjs);

    writeScenario(sId, scenario);
    delete locks.lines[userId];
    res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});

app.post('/api/scenarios/:scenarioId/characters/lock', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    const { userId, characterName } = req.body;
    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    if (!locks.characters[sId]) locks.characters[sId] = {};
    if (locks.characters[sId][characterName] && locks.characters[sId][characterName] !== userId) {
        return res.status(409).json({ message: "Konflikt! Ime lika je vec zakljucano!" });
    }
    locks.characters[sId][characterName] = userId;
    res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post('/api/scenarios/:scenarioId/characters/update', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    const { userId, oldName, newName } = req.body;
    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    let scenario = readScenario(sId);
    scenario.content.forEach(l => {
        if (l.text) l.text = l.text.split(oldName).join(newName);
    });
    writeScenario(sId, scenario);
    if (locks.characters[sId]) delete locks.characters[sId][oldName];
    addDelta({ scenarioId: sId, type: "char_rename", oldName: oldName, newName: newName, timestamp: Math.floor(Date.now() / 1000) });
    res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});

app.get('/api/scenarios/:scenarioId/deltas', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    const since = parseInt(req.query.since) || 0;
    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    const filtered = readDeltas().filter(d => d.scenarioId === sId && d.timestamp > since).sort((a, b) => a.timestamp - b.timestamp);
    res.status(200).json({ deltas: filtered });
});

app.get('/api/scenarios/:scenarioId', (req, res) => {
    const sId = parseInt(req.params.scenarioId);
    if (!scenarioExists(sId)) return res.status(404).json({ message: "Scenario ne postoji!" });
    res.status(200).json(readScenario(sId));
});

app.listen(PORT, () => console.log(`Server na http://localhost:${PORT}`));