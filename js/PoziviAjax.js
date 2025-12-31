const PoziviAjax = (function() {
    const BASE_URL = 'http://localhost:3000/api';
    
    // Helper funkcija za AJAX pozive
    function ajaxCall(method, url, data, callback) {
        const xhr = new XMLHttpRequest();
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                let response = null;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    response = { error: 'Invalid JSON response' };
                }
                callback(xhr.status, response);
            }
        };
        
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        if (data) {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    }
    
    return {
        // POST /api/scenarios - Kreira novi scenarij
        postScenario: function(title, callback) {
            ajaxCall('POST', `${BASE_URL}/scenarios`, { title }, callback);
        },
        
        // POST /api/scenarios/:scenarioId/lines/:lineId/lock - Zaključava liniju
        lockLine: function(scenarioId, lineId, userId, callback) {
            ajaxCall('POST', `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}/lock`, 
                { userId }, callback);
        },
        
        // PUT /api/scenarios/:scenarioId/lines/:lineId - Ažurira liniju
        updateLine: function(scenarioId, lineId, userId, newText, callback) {
            ajaxCall('PUT', `${BASE_URL}/scenarios/${scenarioId}/lines/${lineId}`, 
                { userId, newText }, callback);
        },
        
        // POST /api/scenarios/:scenarioId/characters/lock - Zaključava ime lika
        lockCharacter: function(scenarioId, characterName, userId, callback) {
            ajaxCall('POST', `${BASE_URL}/scenarios/${scenarioId}/characters/lock`, 
                { userId, characterName }, callback);
        },
        
        // POST /api/scenarios/:scenarioId/characters/update - Ažurira ime lika
        updateCharacter: function(scenarioId, userId, oldName, newName, callback) {
            ajaxCall('POST', `${BASE_URL}/scenarios/${scenarioId}/characters/update`, 
                { userId, oldName, newName }, callback);
        },
        
        // GET /api/scenarios/:scenarioId/deltas?since={timestamp} - Vraća promjene
        getDeltas: function(scenarioId, since, callback) {
            ajaxCall('GET', `${BASE_URL}/scenarios/${scenarioId}/deltas?since=${since}`, 
                null, callback);
        },
        
        // GET /api/scenarios/:scenarioId - Vraća scenarij
        getScenario: function(scenarioId, callback) {
            ajaxCall('GET', `${BASE_URL}/scenarios/${scenarioId}`, null, callback);
        }
    };
})();