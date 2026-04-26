import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="app">
      <main className="content">
        <h1>Project Template</h1>
        <p>
          Edit <code>src/App.jsx</code> to start building.
        </p>
      </main>

      <Footer
        attribution={{
          text: "Yan Holtz's D3-loves-react course",
          href: "http://d3-loves-react.com",
        }}
        links={[
          {
            href: "https://adam-tuoa.github.io/homepage/",
            label: "Homepage",
            icon: "home",
          },
          {
            href: "https://github.com/adam-tuoa",
            label: "GitHub",
            icon: "github",
          },
        ]}
      />
    </div>
  );
}

export default App;
