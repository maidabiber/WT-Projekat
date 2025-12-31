document.addEventListener('DOMContentLoaded', function() {
    
    let divEditor = document.querySelector('.editor-paper') || document.getElementById('divEditor');
    if (!divEditor) {
        console.error('Editor div nije pronađen!');
        return;
    }
    
    if (!divEditor.hasAttribute('contenteditable')) {
        divEditor.setAttribute('contenteditable', 'true');
    }

    let currentLockedLineId = null;

    // --- PORUKE ---
    let divPoruke = document.getElementById('poruke');
    if (!divPoruke) {
        divPoruke = document.createElement('div');
        divPoruke.id = 'poruke';
        divPoruke.style.cssText = `font-family: 'Courier New', monospace; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: none; width: 100%; max-height: 300px; overflow-y: auto; border: 2px solid #0ea5e9; background: #f0f9ff; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; max-width: 900px;`;
        divEditor.parentNode.insertBefore(divPoruke, divEditor);
    }

    function prikaziPoruku(poruka, tip = 'info') {
        divPoruke.style.display = 'block';
        divPoruke.style.background = tip === 'error' ? '#fee2e2' : (tip === 'success' ? '#d1fae5' : '#f0f9ff');
        divPoruke.style.borderColor = tip === 'error' ? '#ef4444' : (tip === 'success' ? '#10b981' : '#0ea5e9');
        divPoruke.innerHTML = `<pre style="margin:0; white-space: pre-wrap;">${poruka}</pre>`;
        
        setTimeout(() => {
            divPoruke.style.display = 'none';
        }, 5000);
    }

    function prikaziJSON(status, response) {
        divPoruke.style.display = 'block';
        
        if (status === 200 || status === 201) {
            divPoruke.style.background = '#d1fae5';
            divPoruke.style.borderColor = '#10b981';
        } else if (status === 409) {
            divPoruke.style.background = '#fef3c7';
            divPoruke.style.borderColor = '#f59e0b';
        } else {
            divPoruke.style.background = '#fee2e2';
            divPoruke.style.borderColor = '#ef4444';
        }
        
        divPoruke.innerHTML = '<pre style="margin:0; white-space: pre-wrap;">' + JSON.stringify(response, null, 2) + '</pre>';
    }


    function ucitajICrtajScenario() {
        const scenarioIdInput = document.getElementById('scenarioId');
        const sId = scenarioIdInput ? scenarioIdInput.value : 1; 

        PoziviAjaxFetch.getScenario(sId, function(status, data) {
            if (status === 200) {
                divEditor.innerHTML = "";
                
                if (data.content && data.content.length > 0) {
                    data.content.forEach(linija => {
                        let p = document.createElement('p');
                        p.className = 'dialogue';
                        p.textContent = linija.text || "";
                        p.setAttribute('data-line-id', linija.lineId); 
                        p.setAttribute('contenteditable', 'true');
                        divEditor.appendChild(p);
                    });
                } else {
                    let p = document.createElement('p');
                    p.className = 'dialogue';
                    p.innerHTML = "<br>";
                    p.setAttribute('data-line-id', "1");
                    p.setAttribute('contenteditable', 'true');
                    divEditor.appendChild(p);
                }
                
                const naslovElem = document.getElementById('naslov-scenarija');
                if (naslovElem) naslovElem.textContent = data.title || "Novi Scenario";
                
                try { editor = EditorTeksta(divEditor); } catch(e) {}
                
            } else {
                prikaziPoruku("Greška pri učitavanju: " + (data ? data.message : "Server nedostupan"), "error");
            }
        });
    }

   
    function lockLine(lineId, callback) {
        const uId = document.getElementById('userId').value || 1;
        const sId = document.getElementById('scenarioId').value || 1;
        
        PoziviAjaxFetch.lockLine(sId, lineId, uId, function(status, data) {
            if (status === 200) {
                currentLockedLineId = lineId;
                if (callback) callback(true);
            } else {
                prikaziPoruku("Greška zaključavanja: " + data.message, "error");
                if (callback) callback(false);
            }
        });
    }

    
    function updateLine(lineId, noviTekst, callback) {
        const uId = document.getElementById('userId').value || 1;
        const sId = document.getElementById('scenarioId').value || 1;

        if (currentLockedLineId !== lineId) {
            prikaziPoruku("Morate prvo zaključati liniju!", "error");
            return;
        }

        const cleanText = noviTekst
            .replace(/[\n\r\t]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        PoziviAjaxFetch.updateLine(sId, lineId, uId, [cleanText], function(status, data) {
            if (status === 200) {
                currentLockedLineId = null;
                ucitajICrtajScenario();
                if (callback) callback(true);
            } else {
                prikaziPoruku("Greška ažuriranja: " + data.message, "error");
                if (callback) callback(false);
            }
        });
    }

    const btnUcitaj = document.getElementById('btn-ucitaj');
    if (btnUcitaj) {
        btnUcitaj.onclick = function() {
            const scenarioId = parseInt(document.getElementById('scenarioId').value);
            
            PoziviAjax.getScenario(scenarioId, function(status, response) {
                prikaziJSON(status, response);
                
                if (status === 200) {
                    document.getElementById('naslov-scenarija').textContent = response.title;
                }
            });
        };
    }

    const btnKreiraj = document.getElementById('btn-kreiraj');
    if (btnKreiraj) {
        btnKreiraj.onclick = function() {
            const naslov = prompt("Unesite naslov za novi scenarij:");
            if (naslov && naslov.trim() !== "") {
                PoziviAjaxFetch.postScenario(naslov, function(status, data) {
                    if (status === 201 || status === 200) {
                        document.getElementById('scenarioId').value = data.id;
                        prikaziJSON(status, data);
                        ucitajICrtajScenario(); 
                    } else {
                        prikaziJSON(status, data);
                    }
                });
            }
        };
    }

   
    const btnZakljucaj = document.getElementById('btn-zakljucaj');
    if (btnZakljucaj) {
        btnZakljucaj.onclick = function() {
            const scenarioId = parseInt(document.getElementById('scenarioId').value);
            const lineId = parseInt(document.getElementById('lineId').value);
            const userId = parseInt(document.getElementById('userId').value);
            
            PoziviAjax.lockLine(scenarioId, lineId, userId, function(status, response) {
                prikaziJSON(status, response);
            });
        };
    }

    
    const btnAzuriraj = document.getElementById('btn-azuriraj');
    if (btnAzuriraj) {
        btnAzuriraj.onclick = function() {
            const scenarioId = parseInt(document.getElementById('scenarioId').value);
            const lineId = parseInt(document.getElementById('lineId').value);
            const userId = parseInt(document.getElementById('userId').value);
            
            const noviTekst = prompt('Unesi novi tekst (odvojeno zarezom za više linija):');
            if (!noviTekst) return;
            
            const newText = noviTekst.split(',').map(t => t.trim());
            
           
            PoziviAjax.updateLine(scenarioId, lineId, userId, newText, function(status, response) {
                prikaziJSON(status, response);
            });
        };
    }

   
    const btnLockChar = document.getElementById('btn-lock-char');
    if (btnLockChar) {
        btnLockChar.onclick = function() {
            const uId = document.getElementById('userId').value || 1;
            const sId = document.getElementById('scenarioId').value || 1;
            const charName = document.getElementById('inputCharName').value;
            if(!charName) return alert("Unesite ime lika!");
            
            PoziviAjaxFetch.lockCharacter(sId, charName, uId, (status, data) => {
                prikaziJSON(status, data);
            });
        };
    }

    // UPDATE CHARACTER
    const btnUpdateChar = document.getElementById('btn-update-char');
    if (btnUpdateChar) {
        btnUpdateChar.onclick = function() {
            const uId = document.getElementById('userId').value || 1;
            const sId = document.getElementById('scenarioId').value || 1;
            const oldN = document.getElementById('inputCharName').value;
            const newN = document.getElementById('inputNewCharName').value;
            
            PoziviAjaxFetch.updateCharacter(sId, uId, oldN, newN, (status, data) => {
                prikaziJSON(status, data);
                if(status === 200) ucitajICrtajScenario();
            });
        };
    }

    // DELTAS - sa JSON prikazom
    const btnDeltas = document.getElementById('btn-delte');
    if (btnDeltas) {
        btnDeltas.onclick = function() {
            const scenarioId = parseInt(document.getElementById('scenarioId').value);
            
            PoziviAjax.getDeltas(scenarioId, 0, function(status, response) {
                divPoruke.style.display = 'block';
                
                if (status === 200) {
                    divPoruke.style.background = '#f0f9ff';
                    divPoruke.style.borderColor = '#0ea5e9';
                } else {
                    divPoruke.style.background = '#fee2e2';
                    divPoruke.style.borderColor = '#ef4444';
                }
                
                divPoruke.innerHTML = '<pre style="margin:0; white-space: pre-wrap;">' + JSON.stringify(response, null, 2) + '</pre>';
            });
        };
    }

    // --- KLIK NA LINIJU ---
    divEditor.addEventListener('click', function(e) {
        const p = e.target.closest('p');
        if (p) {
            const lineId = p.getAttribute('data-line-id');
            const lIdInput = document.getElementById('lineId');
            if (lIdInput) lIdInput.value = lineId;
            
            divEditor.querySelectorAll('p').forEach(el => {
                el.style.backgroundColor = "transparent";
                el.style.borderLeft = "none";
            });
            p.style.backgroundColor = "#f0f9ff";
            p.style.borderLeft = "3px solid #60a5fa";
            
            lockLine(lineId, function(success) {
                if (success) {
                    p.style.borderLeft = "3px solid #10b981";
                }
            });
        }
    });

    // --- FOCUS OUT ---
    let isUpdating = false;
    
    divEditor.addEventListener('focusout', function(e) {
        const p = e.target.closest('p');
        if (!p || isUpdating) return;

        const lineId = p.getAttribute('data-line-id');
        const noviTekst = p.textContent || "";

        if (currentLockedLineId && currentLockedLineId == lineId) {
            isUpdating = true;
            p.style.borderLeft = "3px solid #fbbf24";
            
            updateLine(lineId, noviTekst, function(success) {
                isUpdating = false;
                if (success) {
                    p.style.borderLeft = "none";
                } else {
                    p.style.borderLeft = "3px solid #ef4444";
                }
            });
        }
    });

    // --- ENTER KEY ---
    divEditor.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const selection = window.getSelection();
            const currentP = selection.anchorNode.parentElement.closest('p');
            
            if (currentP) {
                const newP = document.createElement('p');
                newP.className = 'dialogue';
                newP.innerHTML = '<br>';
                newP.setAttribute('contenteditable', 'true');
                newP.setAttribute('data-line-id', 'temp-' + Date.now());
                
                currentP.parentNode.insertBefore(newP, currentP.nextSibling);
                newP.focus();
            }
        }
    });

    // --- INICIJALIZACIJA ---
    let editor;
    try {
        editor = EditorTeksta(divEditor);
        ucitajICrtajScenario();
    } catch (error) {
        console.error('Greška pri inicijalizaciji:', error.message);
    }

    // --- DUGMAD ZA ANALIZU ---
    let kontroleDiv = document.createElement('div');
    kontroleDiv.className = 'kontrole-container';
    kontroleDiv.style.cssText = `padding: 1rem; background: white; border-radius: 8px; display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 100%; max-width: 900px;`;
    
    let dugmeStil = `font-weight: 600; font-size: 14px; background: #60a5fa; color: white; padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer;`;

    const akcije = [
        { t: 'Broj riječi', f: () => { let r = editor.dajBrojRijeci(); prikaziPoruku(`UKUPNO: ${r.ukupno}\nBold: ${r.boldiranih}\nItalic: ${r.italic}`); }},
        { t: 'Prikaži uloge', f: () => { let u = editor.dajUloge(); prikaziPoruku(u.length > 0 ? `ULOGE:\n${u.join('\n')}` : "Nema pronađenih uloga"); }},
        { t: 'Pogrešne uloge', f: () => { let p = editor.pogresnaUloga(); prikaziPoruku(p.length > 0 ? `POGREŠNE:\n${p.join('\n')}` : "Nema pogrešnih uloga"); }},
        { t: 'Broj linija', f: () => { let u = prompt("Ime uloge:"); if(u) prikaziPoruku(`Uloga ${u}: ${editor.brojLinijaTeksta(u)} linija`); }},
        { t: 'Scenarij uloge', f: () => { let u = prompt("Ime uloge:"); if(u) prikaziPoruku(JSON.stringify(editor.scenarijUloge(u), null, 2)); }},
        { t: 'Grupisi uloge', f: () => prikaziPoruku(JSON.stringify(editor.grupisiUloge(), null, 2)) }
    ];

    akcije.forEach(a => {
        let btn = document.createElement('button');
        btn.textContent = a.t;
        btn.style.cssText = dugmeStil;
        btn.onclick = a.f;
        kontroleDiv.appendChild(btn);
    });

    let sep = document.createElement('div'); 
    sep.style.cssText = "width:100%; height:1px; background:#eee; margin:5px 0;";
    kontroleDiv.appendChild(sep);

    const formatiranje = [
        { t: '<strong>B</strong>', f: () => { if(editor.formatirajTekst('bold')) prikaziPoruku('Tekst boldiran!', 'success'); }, s: 'width:45px;' },
        { t: '<em>I</em>', f: () => { if(editor.formatirajTekst('italic')) prikaziPoruku('Tekst italic!', 'success'); }, s: 'width:45px;' },
        { t: '<u>U</u>', f: () => { if(editor.formatirajTekst('underline')) prikaziPoruku('Tekst podvučen!', 'success'); }, s: 'width:45px;' }
    ];

    formatiranje.forEach(form => {
        let btn = document.createElement('button');
        btn.innerHTML = form.t;
        btn.style.cssText = dugmeStil + form.s;
        btn.onclick = form.f;
        kontroleDiv.appendChild(btn);
    });

    divEditor.parentNode.insertBefore(kontroleDiv, divEditor);
});