/* Example of how to use those rules:
 import { passwordPatternRule } from './path/to/passwordPatternRule';
 const errorMessage = 'Password must contain at least one digit and one letter, and be at least 8 characters long.';
 const passwordRule = passwordPatternRule(errorMessage);
 const isValid = passwordRule(password);
 if (!isValid) {
   console.log(errorMessage);
 }
*/

const emailValidationRegex = new RegExp("^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,})+$")

export const requiredRule:((msg:string) => ((v: string) => boolean|string)) =
function (msg: string) { 
    return (v:string) => v.length > 0 || msg;
};

export const emailRule:((msg:string) => ((v: string) => boolean|string)) = 
function (msg: string) { 
    return (v:string) => !v || emailValidationRegex.test(v) || msg;
};

export const passwordPatternRule:((msg:string) => ((v: string) => boolean|string)) = 
function (msg: string) { 
    return (v:string) => !v || /^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$/.test(v) || msg;
};

export const sameRule:((value: string, msg:string) => ((v: string) => boolean|string)) = 
function (value: string, msg: string) { 
    return (v:string) => v !== value || msg;
};
