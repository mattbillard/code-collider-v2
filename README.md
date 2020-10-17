# Code Collider v2

This project can inject one website/app into another. This is useful when you are asked to collaborate with another team and provide them with code but aren't able/allowed to run their dev environment.

Also a chance to practice Express, proxies, network requests, etc

## Set up

- Prerequisites: Node
- Run the following
  ```
  npm install
  ```

## To Run

- Run the following (or use the corresponding VSCode debug script)
  ```
  npm start
  ```
- Open the following in your browser  
  http://localhost:8000
  http://localhost:8000/code-collider
- Optionally: open config.js and change the 2 websites/apps to combine

## Notable Files

These are most interesting files to look at and learn from:

- /config.js
- /routes/proxy.route1.js - original solution with "creative" use of HTML's base tag
- /routes/proxy.route2.js - better solution that first asks WEBSITE1 for every resourse and then if 404, asks WEBSITE2

## Resources

The following resources were important in creating this project

- Proxies and piping responses  
  https://github.com/request/request  
  https://stackoverflow.com/questions/49588323/pipe-response-on-callback/49672218#49672218  
  https://stackoverflow.com/questions/18141499/mikeals-nodejs-request-modify-body-before-piping/19822124#19822124
- HTML base tag
  https://www.w3schools.com/tags/tag_base.asp  
  https://stackoverflow.com/questions/807878/how-to-make-javascript-execute-after-page-load/36096571#36096571
