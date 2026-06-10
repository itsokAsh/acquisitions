import express from "express";
const app = express();

app.get('/',(req,res)=>{
    res.status(200).send('Welcome to the Acquisitions API');
})

export default app;