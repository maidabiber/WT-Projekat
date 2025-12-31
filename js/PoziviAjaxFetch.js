const PoziviAjaxFetch = (function() {
    const BASE_URL = 'http://localhost:3000/api';
    
    // Helper funkcija za fetch pozive
    async function fetchCall(method, url, data) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const json = await response.json();
            
            return { status: response.status, data: json };
        } catch (error) {
            return { status: 0, data: { error: error.message } };
        }
    }
    
    return {
        // POST /api/scenarios - Kreira novi scenarij
        postScenario: async function(title, callback) {
            const result = await fetchCall('POST', `${BASE_URL}/scenarios`, { title });
            callback(result.status, result.data);
        },

        lockCharacter: function(scenarioId, characterName, userId, callback) {
    fetch(`/api/scenarios/${scenarioId}/characters/lock`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: parseInt(userId), characterName: characterName })
    }).then(res => res.json().then(data => callback(res.status, data)));
},

updateCharacter: function(scenarioId, userId, oldName, newName, callback) {
    fetch(`/api/scenarios/${scenarioId}/characters/update`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: parseInt(userId), oldName: oldName, newName: newName })
    }).then(res => res.json().then(data => callback(res.status, data)));
},
        
        // POST /api/scenarios/:scenarioId/lines/:lineId/lock - Zaključava liniju
        lockLine: async function(scenarioId, lineId, userId, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}/lock`, 
                { userId });
            callback(result.status, result.data);
        },
        
        // PUT /api/scenarios/:scenarioId/lines/:lineId - Ažurira liniju
        updateLine: async function(scenarioId, lineId, userId, newText, callback) {
            const result = await fetchCall('PUT', 
                `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}`, 
                { userId, newText });
            callback(result.status, result.data);
        },
        
        // POST /api/scenarios/:scenarioId/characters/lock - Zaključava ime lika
        lockCharacter: async function(scenarioId, characterName, userId, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${scenarioId}/characters/lock`, 
                { userId, characterName });
            callback(result.status, result.data);
        },
        
        
        // POST /api/scenarios/:scenarioId/characters/update - Ažurira ime lika
        updateCharacter: async function(scenarioId, userId, oldName, newName, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${scenarioId}/characters/update`, 
                { userId, oldName, newName });
            callback(result.status, result.data);
        },
        
        // GET /api/scenarios/:scenarioId/deltas?since={timestamp} - Vraća promjene
        getDeltas: async function(scenarioId, since, callback) {
            const result = await fetchCall('GET', 
                `${BASE_URL}/scenarios/${scenarioId}/deltas?since=${since}`, 
                null);
            callback(result.status, result.data);
        },
        
        // GET /api/scenarios/:scenarioId - Vraća scenarij
        getScenario: async function(scenarioId, callback) {
            const result = await fetchCall('GET', 
                `${BASE_URL}/scenarios/${scenarioId}`, 
                null);
            callback(result.status, result.data);
        }

        
    };
})();