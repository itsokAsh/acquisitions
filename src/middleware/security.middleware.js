import aj from "../config/arcjet.js";
import logger from "../config/logger.js";
import {slidingWindow} from "@arcjet/node";

const securityMiddleware = async(req,res,next)=>{
    try{
        const role = req.user?.role || 'guest'; 
        // Default to 'guest' if no user or role is found
        let limit;
        let message;
        switch(role){
            case 'admin':
                limit = 20;
                message = 'Admin rate limit exceeded. Please try again later.';
                break;
            case 'user':
                limit = 10;
                message = 'User rate limit exceeded. Please try again later.';
                break;
            case 'guest':
                limit = 5;
                message = 'Guest rate limit exceeded. Please try again later.';
                break;
            
        }
        const client = aj.withRule(slidingWindow({
            mode: "LIVE",
            interval: '1m', 
            max: limit,
            name: `${role}-rate-limit`
        }));
        const decision = await client.protect(req);

        if(decision.isDenied() && decision.reason.isBot()){
            logger.warn('Bot request blocked',{ip:req.ip,userAgent: req.get('User-Agent'), path: req.path});
            return res.status(403).json({ error: 'Forbidden', message: 'Bot traffic is not allowed' }); 
        }
        if(decision.isDenied() && decision.reason.isShield()){
            logger.warn('Request blocked by shield',{ip:req.ip,userAgent: req.get('User-Agent'), path: req.path, method: req.method});
            return res.status(403).json({ error: 'Forbidden', message: 'Your request was blocked by our security system' }); 
        }
        if(decision.isDenied() && decision.reason.isRateLimit()){
            logger.warn('Rate limit exceeded',{ip:req.ip,userAgent: req.get('User-Agent'), path: req.path, method: req.method, role});
            return res.status(429).json({ error: 'Too Many Requests', message }); 
        }

        next();

    }catch(e){
        console.log('Arcjet middleware error:', e);
        res.status(500).json({ error: 'Internal Server Error', message: 'Something went wrong with the security middleware' });
    }
}

export {securityMiddleware};