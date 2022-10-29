const md5 = require("md5")

module.exports = {
    genSign : params => {
        const apiKey = 'X5BM3w8N7MKozC0B85o4KMlzLZKhV00y'
        if(!params){
            params = {}
        }
        
        params.apiKey = apiKey
        params.v = 'v1'
        const sortKey = []
    
        for(const key in params){
            if(key !== 'sign' && key !== 'userId' && key !== 'user'){
                sortKey.push(key)
            }
        }
    
        sortKey.sort()
        let paramsHolder = ''
    
        sortKey.forEach(key => {
            paramsHolder += key + params[key]
        })
        return md5(paramsHolder).toString()
    }
}