import Footer from "./components/Footer";
import BubbleChart from "./components/BubbleChart";
import "./App.css";

function App() {
  return (
    <div className="app">
      <main className="content">
        <h1>Wealth buys years — to a point</h1>
        <p className="insight">
          The global curve hides continental stories. Africa shows little
          coupling between wealth and longevity, while Asia and Europe track
          clearly — but flatten above ~$25K. Even Canada and the US, the
          Americas' richest, sit on that plateau, not above it.
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
