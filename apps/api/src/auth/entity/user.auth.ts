import { createId } from '@paralleldrive/cuid2';
class userAuth {
    Id : string
    email : string
    senhaHash : string
    role : ROLES
    Constructor(email : string,senhaHash : string,role : ROLES){
        this.Id = createId()
        this.email = email,
        this.senhaHash = senhaHash,
        this.role = role
    }
}

enum ROLES {
    "Avaliador",
    "candidato",
    "admin"
}
