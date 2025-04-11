require('dotenv').config()
const mongoose = require('mongoose');

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
}).index({
    headline: 'text', 
    short_description: 'text', 
    authors: 'text', 
    category: 'text'
})

// Usage
async function Init(){
    await mongoose.connect(process.env.DB_URL);
}

async function ArticleModel(){
    if(!mongoose.connection.readyState){await Init()}
    
    const model = await mongoose.model('Article', Article)
    return model
}

module.exports = {ArticleModel}