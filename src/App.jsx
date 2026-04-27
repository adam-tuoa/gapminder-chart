import Footer from "./components/Footer";
import BubbleChart from "./components/BubbleChart";
import "./App.css";

function App() {
  return (
    <div className="app">
      <main className="content">
        <h1>Wealth buys years – to a point</h1>
        <p className="insight">
          The shape depends on the scale. On linear, wealth's returns flatten
          above ~$25K – even Canada and the US sit on that plateau (Japan and
          Switzerland, less wealthy, live longer still). Switch to log, and the
          curve straightens, revealing Africa's hidden range – from under $300
          to over $13K from poorest to richest.
        </p>
        <BubbleChart />
        <p className="source">
          Data:{" "}
          <a
            href="https://www.gapminder.org/data/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gapminder
          </a>
          , 2007.
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
