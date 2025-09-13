// app.config.js
export default {
  name: "DemoMaths",
  slug: "DemoMaths",
  version: "1.0.0",
  platforms: ["web"],
  web: {
    bundler: "webpack",
    output: "static",
    // Domaine personnalisé à la racine (ex. https://demo-maths.fr)
    publicPath: "/",
    favicon: "./public/favicon.png"
  }
};
