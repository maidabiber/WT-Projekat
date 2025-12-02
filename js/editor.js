document.addEventListener('DOMContentLoaded', function() {
    
    let divEditor = document.querySelector('.editor-paper') || document.getElementById('divEditor') ;
    
    if (divEditor==false) {
        console.error('Editor div nije pronađen!');
        return;
    }
    
    if (!divEditor.hasAttribute('contenteditable')) {
        divEditor.setAttribute('contenteditable', 'true');
    }
    divEditor.querySelectorAll('.dialogue').forEach(d => {
   
   let text = d.innerText.trim();

  
   // d.innerHTML = text.replace(/\n/g, '<br>');
   d.innerText = text;

});

    
    let editor;
    try {
        editor = EditorTeksta(divEditor);
        console.log('Editor modul uspješno inicijalizovan!');
    } catch (error) {
        console.error('Greška pri inicijalizaciji editora:', error.message);
        alert('Greška: ' + error.message);
        return;
    }
    
    let divPoruke = document.getElementById('poruke');
    if (!divPoruke) {
        divPoruke = document.createElement('div');
        divPoruke.id = 'poruke';
        divPoruke.style.cssText = `
            font-family: 'Courier New', monospace;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: none;
            width: 100%;
            max-height: 300px;
            overflow-y: auto;
            border: 2px solid #0ea5e9;
            background: #f0f9ff;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            max-width: 900px;
        `;
        
        let editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.insertBefore(divPoruke, editorContainer.firstChild);
        }
    }
    
    function prikaziPoruku(poruka, tip = 'info') {
        let boja = tip === 'error' ? '#fee2e2' : (tip === 'success' ? '#d1fae5' : '#f0f9ff');
        let borderBoja = tip === 'error' ? '#ef4444' : (tip === 'success' ? '#10b981' : '#0ea5e9');
        divPoruke.style.display = 'block';
        divPoruke.style.background = boja;
        divPoruke.style.borderColor = borderBoja;
        divPoruke.innerHTML = `<pre style="margin:0; white-space: pre-wrap; word-wrap: break-word;">${poruka}</pre>`;
        divPoruke.scrollTop = divPoruke.scrollHeight;
    }
    
    function sakrijPoruke() {
        divPoruke.style.display = 'none';
    }
    
    let kontroleDiv = document.createElement('div');
    kontroleDiv.className = 'kontrole-container';
    kontroleDiv.style.cssText = `
        padding: 1rem;
        background: white;
        border-radius: 8px;
         display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 900px;
    `;
   
    let dugmeStil = `
        font-weight: 600;
        font-size: 14px;
        background: #60a5fa;
        color: white;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    `;
    

    
    let dugmeBrojRijeci = document.createElement('button');
    dugmeBrojRijeci.textContent = 'Broj riječi';
    dugmeBrojRijeci.style.cssText = dugmeStil;
    dugmeBrojRijeci.onclick = function() {
        try {
            let rezultat = editor.dajBrojRijeci();
            prikaziPoruku(
                `BROJ RIJEČI:\n\n` +
                `Ukupno: ${rezultat.ukupno}\n` +
                `Boldiranih: ${rezultat.boldiranih}\n` +
                `Italic: ${rezultat.italic}`,
                'info'
            );
        } catch (e) {
            prikaziPoruku('Greška: ' + e.message, 'error');
        }
    };
    
    let dugmeUloge = document.createElement('button');
    dugmeUloge.textContent = 'Prikaži uloge';
    dugmeUloge.style.cssText = dugmeStil;
    dugmeUloge.onclick = function() {
        try {
            let uloge = editor.dajUloge();
            if (uloge.length === 0) {
                prikaziPoruku('Nema pronađenih uloga u tekstu.', 'info');
            } else {
                prikaziPoruku(
                    `ULOGE (${uloge.length}):\n\n` + 
                    uloge.map((u, i) => `${i+1}. ${u}`).join('\n'),
                    'info'
                );
            }
        } catch (e) {
            prikaziPoruku('Greška: ' + e.message, 'error');
        }
    };
    
    let dugmePogresneUloge = document.createElement('button');
    dugmePogresneUloge.textContent = 'Pogrešne uloge';
    dugmePogresneUloge.style.cssText = dugmeStil;
    dugmePogresneUloge.onclick = function() {
        try {
            let pogresneUloge = editor.pogresnaUloga();
            if (pogresneUloge.length === 0) {
                prikaziPoruku('Nema potencijalno pogrešnih uloga!', 'success');
            } else {
                prikaziPoruku(
                    `POTENCIJALNO POGREŠNE ULOGE (${pogresneUloge.length}):\n\n` + 
                    pogresneUloge.map((u, i) => `${i+1}. ${u}`).join('\n') +
                    '\n\nOve uloge su slične drugim ulogama koje se češće pojavljuju.',
                    'error'
                );
            }
        } catch (e) {
            prikaziPoruku('Greška: ' + e.message, 'error');
        }
    };
    
    let dugmeBrojLinija = document.createElement('button');
    dugmeBrojLinija.textContent = 'Broj linija';
    dugmeBrojLinija.style.cssText = dugmeStil;
   dugmeBrojLinija.onclick = function() {
    let uloga = prompt('Unesite ime uloge:');
    if (uloga && uloga.trim()) {  // ← OVDE JE BILA GREŠKA!
        try {
            let broj = editor.brojLinijaTeksta(uloga);
            prikaziPoruku(
                `BROJ LINIJA TEKSTA:\n\n` +
                `Uloga: ${uloga.toUpperCase()}\n` +
                `Broj linija: ${broj}`,
                'info'
            );
        } catch (e) {
            prikaziPoruku('Greška: ' + e.message, 'error');
        }
    } else {
        prikaziPoruku('Niste unijeli ime uloge!', 'error');
    }
};
    
    let dugmeScenarijUloge = document.createElement('button');
    dugmeScenarijUloge.textContent = 'Scenarij uloge';
    dugmeScenarijUloge.style.cssText = dugmeStil;
    dugmeScenarijUloge.onclick = function() {
        let uloga = prompt('Unesite ime uloge:');
        if (uloga && uloga.trim()) {
            try {
                let scenarij = editor.scenarijUloge(uloga);
                if (scenarij.length === 0) {
                    prikaziPoruku(
                        `Uloga "${uloga.toUpperCase()}" nije pronađena ili nema replika.`, 
                        'info'
                    );
                } else {
                    let ispis = `SCENARIJ ULOGE "${uloga.toUpperCase()}" (${scenarij.length} replika):\n\n`;
                    scenarij.forEach((s, i) => {
                        ispis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                        ispis += `Replika ${i+1}/${scenarij.length}\n`;
                        ispis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                        ispis += `SCENA: ${s.scena}\n`;
                        ispis += `Pozicija u sceni: ${s.pozicijaUTekstu}\n\n`;
                        if (s.prethodni) {
                            ispis += `Prethodni lik: ${s.prethodni.uloga}\n`;
                            ispis += `  Replika: "${s.prethodni.linije.join(' ')}"\n\n`;
                        } else {
                            ispis += `(početak dijaloga)\n\n`;
                        }
                        ispis += `TRENUTNI: ${s.trenutni.uloga}\n`;
                        ispis += `  Replika: "${s.trenutni.linije.join(' ')}"\n`;
                        ispis += `  (${s.trenutni.linije.length} linija)\n\n`;
                        if (s.sljedeci) {
                            ispis += `Sljedeći lik: ${s.sljedeci.uloga}\n`;
                            ispis += `  Replika: "${s.sljedeci.linije.join(' ')}"\n\n`;
                        } else {
                            ispis += `(kraj dijaloga)\n\n`;
                        }
                    });
                    prikaziPoruku(ispis, 'info');
                }
            } catch (e) {
                prikaziPoruku('Greška: ' + e.message, 'error');
            }
        }
    };
    
    
    let dugmeGrupisiUloge = document.createElement('button');
    dugmeGrupisiUloge.textContent = 'Grupisi uloge';
    dugmeGrupisiUloge.style.cssText = dugmeStil;
    dugmeGrupisiUloge.onclick = function() {
        try {
            let grupe = editor.grupisiUloge();
            if (grupe.length === 0) {
                prikaziPoruku('Nema pronađenih grupa (scene bez replika).', 'info');
            } else {
                let ispis = `GRUPE ULOGA (${grupe.length} dijalog-segmenata):\n\n`;
                grupe.forEach((g, i) => {
                    ispis += `${i+1}. ${g.scena}\n`;
                    ispis += `  Segment: ${g.segment}\n`;
                    ispis += `  Uloge: ${g.uloge.join(', ')}\n`;
                    ispis += `  (${g.uloge.length} ${g.uloge.length === 1 ? 'uloga - monolog' : 'uloge'})\n\n`;
                });
                prikaziPoruku(ispis, 'info');
            }
        } catch (e) {
            prikaziPoruku('Greška: ' + e.message, 'error');
        }
    };
    
   
    
    let dugmeBold = document.createElement('button');
    dugmeBold.innerHTML = '<strong>B</strong>';
    dugmeBold.title = 'Bold';
    dugmeBold.style.cssText = dugmeStil + 'width: 45px; font-weight: 900;';
    dugmeBold.onclick = function() {
        if (editor.formatirajTekst('bold')) {
            prikaziPoruku('Tekst je boldiran!', 'success');
            setTimeout(sakrijPoruke, 2000);
        } else {
            prikaziPoruku('Označite tekst prije formatiranja.', 'error');
        }
    };
    
    let dugmeItalic = document.createElement('button');
    dugmeItalic.innerHTML = '<em>I</em>';
    dugmeItalic.title = 'Italic';
    dugmeItalic.style.cssText = dugmeStil + 'width: 45px; font-style: italic;';
    dugmeItalic.onclick = function() {
        if (editor.formatirajTekst('italic')) {
            prikaziPoruku('Tekst je italic!', 'success');
            setTimeout(sakrijPoruke, 2000);
        } else {
            prikaziPoruku('Označite tekst prije formatiranja.', 'error');
        }
    };
    
    let dugmeUnderline = document.createElement('button');
    dugmeUnderline.innerHTML = '<u>U</u>';
    dugmeUnderline.title = 'Underline';
    dugmeUnderline.style.cssText = dugmeStil + 'width: 45px; text-decoration: underline;';
    dugmeUnderline.onclick = function() {
        if (editor.formatirajTekst('underline')) {
            prikaziPoruku('Tekst je podvučen!', 'success');
            setTimeout(sakrijPoruke, 2000);
        } else {
            prikaziPoruku('Označite tekst prije formatiranja.', 'error');
        }
    };
    
    
    kontroleDiv.appendChild(dugmeBrojRijeci);
    kontroleDiv.appendChild(dugmeUloge);
    kontroleDiv.appendChild(dugmePogresneUloge);
    kontroleDiv.appendChild(dugmeBrojLinija);
    kontroleDiv.appendChild(dugmeScenarijUloge);
    kontroleDiv.appendChild(dugmeGrupisiUloge);
    
    let separator = document.createElement('div');
    separator.style.cssText = 'width: 100%; height: 1px; background: #e5e7eb; margin: 5px 0;';
    kontroleDiv.appendChild(separator);
    
    let labelFormat = document.createElement('span');
    labelFormat.textContent = 'Formatiranje:';
    labelFormat.style.cssText = 'font-size: 12px; color: #666; margin-right: 10px;';
    kontroleDiv.appendChild(labelFormat);
    
    kontroleDiv.appendChild(dugmeBold);
    kontroleDiv.appendChild(dugmeItalic);
    kontroleDiv.appendChild(dugmeUnderline);
    
    let editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        let editorPaper = editorContainer.querySelector('.editor-paper');
        if (editorPaper) {
            editorContainer.insertBefore(kontroleDiv, editorPaper);
        } else {
            editorContainer.appendChild(kontroleDiv);
        }
    }
    
    let dugmad = kontroleDiv.querySelectorAll('button');
    dugmad.forEach(dugme => {
        dugme.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
        dugme.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
    });
    
    console.log('Sva dugmad i kontrole uspješno dodane!');
});
