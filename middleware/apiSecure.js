const {genSign} = require('../util/sign')
const apiSecure = async (req, res, next) => {
    try {
        const { stime, sign, nonce } = req.query
        if(!stime || !sign || !nonce){
            return res.status(400).json({
                status: 'error',
                massage: 'bad request!!!'
            })
        }

        const istime = Math.floor((Date.now() - stime) / 1000)
        if(istime > 100){
            return res.status(401).json({
                status: 'error',
                massage: 'bad request!'
            })
        }

        const signSever = await genSign(req.query)
        if(signSever !== sign){
            return res.status(401).json({
                status: 'error',
                massage: 'bad request!!'
            })
        }
        
        next()
    } catch (error) {
        next(error)        
    }
}

module.exports = apiSecure