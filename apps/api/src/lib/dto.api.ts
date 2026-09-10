import axios from "axios"

const URL_BASE = process.env.API_URL 


type userRequestLogin = {
    uuid : string
    email: string
    senha : string
}


const api = axios.create({
    baseURL:URL_BASE,
    timeout: 10000,
    withCredentials:true,
})

const postLogin =  (data:userRequestLogin):boolean => {
    axios.post('${URL_BASE}' + '/auth/login',data)
    return true
}


