export const formatValidationError = (error)=>{
    if(!errors || !errors.issues) return 'Validation failed';
     
    if(Array.isArray(error.issues)) return errors.issues.map(i=>i.message).join('.');

    return JSON.stringify(error);
}