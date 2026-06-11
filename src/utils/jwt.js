import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const JWT_EXPIRATION = '1d'; // Token expires in 1 day

export const jwttoken = {
    sign: (payload) => {
        try{
            return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
        }catch(e){
            logger.error('Error signing JWT token', { error: e });
            throw new Error('Failed to authenticate user');
        }
    },
    verify: (token) =>{
        try{
            return jwt.verify(token, JWT_SECRET);
        }catch(e){
            logger.error('Error verifying JWT token', { error: e });
            throw new Error('Failed to authenticate user');

    }
}
}