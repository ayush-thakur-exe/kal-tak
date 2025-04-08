require('dotenv').config()
const mongoose = require('mongoose');

let isConnected = false

// Model
const Article = new mongoose.Schema({
    category: String,
    headline: String,
    short_description: String,
    authors: String,
    date: String,
    link: String
}, {
    collection: "article"
})

// Usage
async function Init(){
    await mongoose.connect(process.env.DB_URL);
    isConnected = true
}

async function ArticleModel(){
    if(!isConnected){await Init()}
    
    const model = await mongoose.model('Article', Article)
    return model
}

module.exports = {ArticleModel}