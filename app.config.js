export default {
  name: "DemoMaths",
  slug: "DemoMaths",
  version: "1.0.0",
  platforms: ["web"],

  web: {
    bundler: "webpack",      // ← quitte Metro et supprime l’erreur expo/dom/global
    output: "static",        // un HTML par route (peut être "single")
    publicPath: "/DemoMaths/" // racine sur GitHub Pages
  }
};
