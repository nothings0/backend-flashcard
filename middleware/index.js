const jwt = require("jsonwebtoken")

const verifyToken = (req, res, next) => {
    const token = req.headers.token
    if(token){
        const accessToken = token.split(" ")[1]
        jwt.verify(accessToken, process.env.SECRET_KEY, (err, user) => {
            if(err){
                return res.status(403).json({code: 403, msg: err.message})
            }
            req.user = user
            next()
        })
    }else{
        return res.status(401).json({code: 401, msg: "You're not authenticated"})
    }
}
const verifyAdmin = (req, res, next) => {
    const token = req.headers.token
    if(token){
        const accessToken = token.split(" ")[1]
        jwt.verify(accessToken, process.env.SECRET_KEY, (err, user) => {
            if(err){
                return res.status(403).json({code: 403, msg: err.message})
            }
            if(user.isAdmin){
                req.user = user
                next()
            }else{
                res.status(403).json({code: 403, msg: "User are not admin"})
            }
        })
    }else{
        return res.status(401).json({code: 401, msg: "You're not authenticated"})
    }
}

module.exports = {verifyToken, verifyAdmin}