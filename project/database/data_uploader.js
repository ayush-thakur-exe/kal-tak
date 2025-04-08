const { ArticleModel } = require("./model/Article");

const fs = require('fs')

let data = fs.readFileSync("C:\\Users\\Ayush\\Documents\\Humber\\ITE5315 - Web Framework 1\\Project\\toofan-express\\dataset\\News_Category_Dataset_v3.json")


async function insertData(x){
    let model = await ArticleModel()
    let newEntry = new model({
        category: x.category,
        headline: x.headline,
        short_description: x.short_description,
        authors: x.authors,
        date: x.date,
        link: x.link
    })

    let res = await newEntry.save()
    console.log("inserted: " + res)
    return true
}

/* 
    Last uploaded - 8th April 2025
    Data from 0 to 27824
*/
async function databaseUpdate(){
    let jsonData = await JSON.parse(data)
    let len = jsonData.length

    for(let i = 0; i < len; i++){
        await insertData(jsonData[i])
    }
}

databaseUpdate()