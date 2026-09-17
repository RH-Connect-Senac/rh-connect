type Login = {
    email : string;
    password:string;
}
type InviteEvaluate = {
    name:string;
    email:string;
    area?:string;
    specialization?:string
}

type RegisterDto = {
    name : string;
    email : string;
    password : string;
}

type ActivateEvaluator = {
    token : string;
    password : string; 
}