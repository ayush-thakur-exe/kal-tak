require('dotenv').config()
const mongoose = require('mongoose');

// Model
const User = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
    token: String
}, {
    collection: "user"
})

// Usage
async function Init(){
    await mongoose.connect(process.env.DB_URL);
}

async function UserModel(){
    if(!mongoose.connection.readyState){await Init()}
    
    const model = await mongoose.model('User', User)
    return model
}

module.exports = {UserModel}