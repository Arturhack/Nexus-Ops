// App.js
const { useState } = React;

function App() {
  const [objectives, setObjectives] = useState([
    { id: 1, text: "Secure the Power Relays", completed: false },
    { id: 2, text: "Defend the Base for 3 Turns", completed: false },
    { id: 3, text: "Collect 10 Tech Tokens", completed: false },
    { id: 4, text: "Explore All Forest Tiles", completed: false },
    { id: 5, text: "Defeat the Enemy Commander", completed: false }
  ]);

  const toggleObjective = (id) => {
    setObjectives((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, completed: !obj.completed } : obj
      )
    );
  };

  return (
    <div className="game-container">
      <h1>Nexus Ops: The Alliance <span className="edition">Deluxe Edition</span></h1>
      <div className="board">
        <p className="board-placeholder">[ Game board visuals go here ]</p>
      </div>
      <div className="objectives">
        <h2>Objectives</h2>
        <ul>
          {objectives.map((obj) => (
            <li
              key={obj.id}
              className={obj.completed ? "completed" : ""}
              onClick={() => toggleObjective(obj.id)}
            >
              {obj.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
