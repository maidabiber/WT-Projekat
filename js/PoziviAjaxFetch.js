const PoziviAjaxFetch = (function() {
    const BASE_URL = 'http://localhost:3000/api';
    
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
        postScenario: async function(title, callback) {
            const result = await fetchCall('POST', `${BASE_URL}/scenarios`, { title });
            callback(result.status, result.data);
        },
        
        lockLine: async function(scenarioId, lineId, userId, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}/lines/${parseInt(lineId)}/lock`, 
                { userId: parseInt(userId) });
            callback(result.status, result.data);
        },
        
        updateLine: async function(scenarioId, lineId, userId, newText, callback) {
            const result = await fetchCall('PUT', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}/lines/${parseInt(lineId)}`, 
                { userId: parseInt(userId), newText });
            callback(result.status, result.data);
        },
        
        lockCharacter: async function(scenarioId, characterName, userId, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}/characters/lock`, 
                { userId: parseInt(userId), characterName });
            callback(result.status, result.data);
        },
        
        updateCharacter: async function(scenarioId, userId, oldName, newName, callback) {
            const result = await fetchCall('POST', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}/characters/update`, 
                { userId: parseInt(userId), oldName, newName });
            callback(result.status, result.data);
        },

        getDeltas: async function(scenarioId, since, callback) {
            const result = await fetchCall('GET', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}/deltas?since=${since}`, 
                null);
            callback(result.status, result.data);
        },
        
        getScenario: async function(scenarioId, callback) {
            const result = await fetchCall('GET', 
                `${BASE_URL}/scenarios/${parseInt(scenarioId)}`, 
                null);
            callback(result.status, result.data);
        }

        
    };
})();