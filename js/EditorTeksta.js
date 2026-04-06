let EditorTeksta = function (divRef) {
    if (!(divRef instanceof HTMLDivElement)) {
        throw new Error("Pogresan tip elementa!");
    }
    if (divRef.getAttribute("contenteditable") !== "true") {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    const editor = divRef;
    const vratiTekst = () => editor.innerText || '';

    const jeLiLinijaUZagradama = (linija) => {
        const t = linija.trim();
        return t.length > 1 && t.startsWith('(') && t.endsWith(')');
    };

    const jeLiNaslovScene = (linija) => {
        const tekst = linija.trim().toUpperCase();
        if (tekst.startsWith("INT.") || tekst.startsWith("EXT.")) {
            return tekst.includes(" - ") && (
                tekst.includes("DAY") || 
                tekst.includes("NIGHT") || 
                tekst.includes("MORNING") || 
                tekst.includes("EVENING") || 
                tekst.includes("AFTERNOON")
            );
        }
        return false;
    };

    const jeLiUlogaFormat = (linija) => {
        const trimmed = linija.trim();
        if (trimmed==false || jeLiNaslovScene(linija)) {
             return false;
        }
     if (!/[A-ZČĆŽŠĐ]/.test(trimmed)) return false; 
     return /^[A-ZČĆŽŠĐ\s]+$/.test(trimmed);
    };

    const jeLiUlogaSaGovorom = (linije, index) => {
        if (jeLiUlogaFormat(linije[index])==false) return false;

        for (let i = index + 1; i < linije.length; i++) {
            const linija = linije[i];
            const l = linija.trim();
            
            if (!l) continue; 
            if (jeLiNaslovScene(linija)) {
                return false; 
            }
           
             if ( jeLiUlogaFormat(linija)) {
                return false; 
            }
            if (jeLiLinijaUZagradama(linija)) {
                continue; 
            }
           
            return true; 
        }
        return false; 
    };

     const kolikoSeStringoviRazlikuju = (a, b) => {
         a = a.toUpperCase();
        b = b.toUpperCase();
    
        const m = a.length;
        const n = b.length;
    
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
    
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, 
                    dp[i][j - 1] + 1, 
                    dp[i - 1][j - 1] + cost 
                );
            }
        }
    
        return dp[m][n];
    };



    const dajBrojRijeci = function () {
     
        let ukupanBrojRijeci = 0;
        let brojBoldiranihRijeci = 0;
        let brojItalicRijeci = 0;
    
        const charJeItalic = (node) => {
            let element = node.parentElement;
            while (element && element !== editor.parentElement) {
                if (element.tagName === 'I' || element.tagName === 'EM') { return true; }
                try {
                    let style = window.getComputedStyle(element);
                    if (style && style.fontStyle === 'italic') { return true; }
                } catch (e) {}
                element = element.parentElement;
            }
            return false;
        };
    
        const charJeBold = (node) => {
            let element = node.parentElement;
            while (element && element !== editor.parentElement) {
                if (element.tagName === 'B' || element.tagName === 'STRONG') { return true; }
                try {
                    let style = window.getComputedStyle(element);
                    if (style) {
                        let fontWeight = style.fontWeight;
                        if (fontWeight === 'bold' || parseInt(fontWeight) >= 700) { return true;}
                    }
                } catch (e) {}
                element = element.parentElement;
            }
            return false;
        };
    
        const obradiRijec = (charNiz) => {
            if (charNiz.length === 0) return;
    
            let rijec = charNiz.map(x => x.char).join('');
            
          
            if (/[a-zčćžšđA-ZČĆŽŠĐ]/.test(rijec)) {
                ukupanBrojRijeci += 1;
                let svakiCharBoldiran = charNiz.every(info => charJeBold(info.node));
                let svakiCharItalic = charNiz.every(info => charJeItalic(info.node));
    
                if (svakiCharItalic) brojItalicRijeci += 1;
                if (svakiCharBoldiran) brojBoldiranihRijeci += 1;
            }
        };
    
       
        const walker = document.createTreeWalker(
            editor,  NodeFilter.SHOW_TEXT, null, false
        );
    
        let node;
        let currentWordChars = []; 
        
        while (node = walker.nextNode()) {
            let txt = node.textContent;
            if (!txt) continue;
    
            for (let i = 0; i < txt.length; i++) {
                let character = txt[i];
                
                if (/\s/.test(character) || /[.,;:!?(){}[\]]/.test(character)) {
                    if (currentWordChars.length > 0) {
                        obradiRijec(currentWordChars);
                        currentWordChars = []; 
                    }
                } else {    
                    currentWordChars.push({ node: node, char: character });
                }
            }
        }
    
        obradiRijec(currentWordChars); 
    
        return { ukupno: ukupanBrojRijeci, boldiranih: brojBoldiranihRijeci, italic: brojItalicRijeci };
    };

    const dajUloge = function () {
       
        const tekst = vratiTekst();
        const linije = tekst.split('\n');
        
        const jedinstveneUlogeSet = linije.reduce((set, linija, index) => {
            if (jeLiUlogaSaGovorom(linije, index)) { 
                const uloga = linija.trim();
                set.add(uloga);
            }
            return set;
        }, new Set()); 
    
        return Array.from(jedinstveneUlogeSet);
    };
    
    const pogresnaUloga = function () {
   
        const uloge = dajUloge(); 
        const linije = vratiTekst().split('\n');
        const brojac = {};
        
        function izracunajPojavljivanja() {
            for (let i = 0; i < linije.length; i++) {
                if (jeLiUlogaSaGovorom(linije, i)) {
                    const uloga = linije[i].trim();
                    brojac[uloga] = (brojac[uloga] || 0) + 1;
                }
            }
        }
        izracunajPojavljivanja(); 
    
        function jeLiImeSlicno(ime1, ime2) {
            if (ime1 === ime2) return false;
            const maxRazlika = (ime1.length > 5 && ime2.length > 5) ? 2 : 1;
            return kolikoSeStringoviRazlikuju(ime1, ime2) <= maxRazlika;
        }
        
        const pogresneUloge = new Set();  
        for (let i = 0; i < uloge.length; i++) {
            for (let j = i + 1; j < uloge.length; j++) {
                
                const ulogaA = uloge[i];
                const ulogaB = uloge[j];
    
                if (jeLiImeSlicno(ulogaA, ulogaB)) {
                    const countA = brojac[ulogaA] || 0;
                    const countB = brojac[ulogaB] || 0;
                 
                    if (countA >= 4 && (countA - countB) >= 3) {
                        pogresneUloge.add(ulogaB);
                    }
                  
                    if (countB >= 4 && (countB - countA) >= 3) {
                        pogresneUloge.add(ulogaA);
                    }
                }
            }
        }
        return Array.from(pogresneUloge);
    };

   const brojLinijaTeksta = function (uloga) {
    const sveReplikeUloge = scenarijUloge(uloga); 
    
    if (sveReplikeUloge.length === 0) {
        return 0;
    }

    let ukupanBrojLinija = 0;

    sveReplikeUloge.forEach(stavka => {
        if (stavka.trenutni && stavka.trenutni.linije) {
            ukupanBrojLinija += stavka.trenutni.linije.length;
        }
    });

    return ukupanBrojLinija;
};


   
    const parsirajGovor = (linije, startIndex) => {
        let linijeGovora = [];
        let j = startIndex;
        while (j < linije.length) {
            const lin = linije[j];
            if (!lin.trim() || jeLiNaslovScene(lin) || jeLiUlogaSaGovorom(linije, j)) break; 
            if (!jeLiLinijaUZagradama(lin)) {
                linijeGovora.push(lin);
            }
            j++;
        }
        return { linijeGovora, endIndex: j - 1 };
    };
const scenarijUloge = function (uloga) {
    const tekst = vratiTekst();
    const linije = tekst.split('\n');
    const ciljnaUloga = uloga.toUpperCase();
    const rezultat = [];

    let trenutnaScena = "";
    let sveReplikeUSceni = [];
    let replikeUSegmentu = []; 

    for (let i = 0; i < linije.length; i++) {
        const linija = linije[i];
        const trimmed = linija.trim();

      
        if (jeLiNaslovScene(linija)) {
            trenutnaScena = trimmed;
            sveReplikeUSceni = [];
            replikeUSegmentu = [];
            continue;
        }

        
        if (jeLiUlogaSaGovorom(linije, i)) {
            const imeUloge = trimmed;
            const linijeGovora = [];

            let j = i + 1;
            while (j < linije.length) {
                const lin = linije[j];
                if (!lin.trim() || jeLiNaslovScene(lin) || jeLiUlogaSaGovorom(linije, j)) {
                    break;
                }
                if (!jeLiLinijaUZagradama(lin)) {
                    linijeGovora.push(lin);
                }
                j++;
            }

            if (linijeGovora.length > 0) {
                const replika = {
                    uloga: imeUloge,
                    linije: linijeGovora
                };
                
               
                sveReplikeUSceni.push(replika);
                replikeUSegmentu.push(replika);

                if (imeUloge === ciljnaUloga) {
                    const pozicijaUSceni = sveReplikeUSceni.length; 
                    const indexUSegmentu = replikeUSegmentu.length - 1;
                    
                    
                    const prethodni = indexUSegmentu > 0 
                        ? replikeUSegmentu[indexUSegmentu - 1] 
                        : null;
                    
                    let sljedeci = null;
                    
                 
                    let k = j;
                    while (k < linije.length) {
                        const nextLinija = linije[k];
                        const nextTrimmed = nextLinija.trim();
                    
                        if (jeLiNaslovScene(nextLinija)) {
                            break;
                        }
                        
                       
                        if (nextTrimmed && !jeLiLinijaUZagradama(nextLinija) && !jeLiUlogaSaGovorom(linije, k)) {
                            break;
                        }
                        
                        if (jeLiUlogaSaGovorom(linije, k)) {
                            const nextUloga = nextTrimmed;
                            const nextLinijeGovora = [];
                            
                            let m = k + 1;
                            while (m < linije.length) {
                                const lin = linije[m];
                                if (!lin.trim() || jeLiNaslovScene(lin) || jeLiUlogaSaGovorom(linije, m)) {
                                    break;
                                }
                                if (!jeLiLinijaUZagradama(lin)) {
                                    nextLinijeGovora.push(lin);
                                }
                                m++;
                            }
                            
                            if (nextLinijeGovora.length > 0) {
                                sljedeci = {
                                    uloga: nextUloga,
                                    linije: nextLinijeGovora
                                };
                            }
                            break;
                        }
                        
                        k++;
                    }
                    
                    rezultat.push({
                        scena: trenutnaScena,
                        pozicijaUTekstu: pozicijaUSceni,
                        prethodni: prethodni,
                        trenutni: replika,
                        sljedeci: sljedeci
                    });
                }
            }

            i = j - 1;
        }
        
        else if (trimmed && !jeLiLinijaUZagradama(linija) && !jeLiNaslovScene(linija)) {
            replikeUSegmentu = [];
        }
    }

    return rezultat;
};

    const grupisiUloge = function () {
        const linije = vratiTekst().split('\n');
        const rezultat = [];
    
        let trenutnaScena = "";
        let redniBrojSegmenta = 0;
        let ulogeUSegmentu = new Set(); 
        let daLiPostojeReplike = false;
    
        const zavrsiSegment = () => {
            if (ulogeUSegmentu.size > 0 && daLiPostojeReplike) {
                rezultat.push({
                    scena: trenutnaScena,
                    segment: redniBrojSegmenta,
                    uloge: Array.from(ulogeUSegmentu) 
                });
            }
            daLiPostojeReplike = false;
            ulogeUSegmentu.clear(); 
        };
    
        for (let brojac = 0; brojac < linije.length; brojac++) {
            const linija = linije[brojac].trim();
    
            if (jeLiNaslovScene(linija)) {
                zavrsiSegment();
                trenutnaScena = linija;
                redniBrojSegmenta = 0;
                continue;
            }
    
            if (jeLiUlogaSaGovorom(linije, brojac)) {
                const uloga = linija;
    
                if (!daLiPostojeReplike) {
                    redniBrojSegmenta += 1;
                    daLiPostojeReplike = true;
                    ulogeUSegmentu.add(uloga);
                } else {
                    ulogeUSegmentu.add(uloga);
                }
    
                 const { endIndex } = parsirajGovor(linije, brojac + 1);
                brojac = endIndex; 
                
                continue;
            }
      if (linija && !jeLiLinijaUZagradama(linija)) {
                zavrsiSegment();
            }
        }
    
        zavrsiSegment();
    
        return rezultat;
    };


    const formatirajTekst = (komanda) => {
        const dozvoljeneKomande = ['bold', 'italic', 'underline'];
        if (!dozvoljeneKomande.includes(komanda)) return false;
    
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return false;
    
        document.execCommand(komanda);
        return true;
    };



    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst: formatirajTekst
    };
};