import { run } from "uebersicht";

// This is a simple example Widget to get you started with Übersicht.
// For the full documentation please visit:
// https://github.com/felixhageloh/uebersicht

// You can modify this widget as you see fit, or simply delete this file to
// remove it.

// this is the shell command that gets executed every time this widget refreshes

// the refresh frequency in milliseconds
export const refreshFrequency = 1000000;

const parseDate = (twDate) => {
  const year = Number(twDate.substring(0, 4));
  const month = Math.max(Number(twDate.substring(4, 6)) - 1, 0);
  const day = Number(twDate.substring(6, 8));
  const hour = Number(twDate.substring(9, 11));
  const minute = Number(twDate.substring(11, 13));
  const second = Number(twDate.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

const TaskRow = ({ task: { description, entry, start } }) => {
  const dateAdded = entry ? parseDate(entry) : "";
  const dateStarted = start ? parseDate(start) : "";
  return (
    <tr>
      <td>{description}</td>
      <td>{dateAdded.toString()}</td>
      <td>{dateStarted.toString()}</td>
    </tr>
  );
};

// the CSS style for this widget, written using Emotion
// https://emotion.sh/
export const className = `
  top: 20px;
  left: 10px;
  width: 460px;
  box-sizing: border-box;
  margin: auto;
  padding: 20px 20px 20px;
  background-color: rgba(255, 255, 255, 0.5);
  background-repeat: no-repeat;
  background-size: 176px 84px;
  background-position: 50% 20px;
  -webkit-backdrop-filter: blur(20px);
  color: #141f33;
  font-family: Helvetica Neue;
  font-weight: 300;
  text-align: left;
  line-height: 1.5;

  h2 {
    font-size: 20px;
    margin: 10px 0 10px;
  }

  em {
    font-weight: 400;
    font-style: normal;
  }

  tr {
    margin: 10px;
  }

  td {
    padding: 5px;
}

  .urgency {
    text-align: right;
  }
`;

const filter = "(status:pending or status:active) and -BLOCKED";

// export const command = `/usr/local/bin/task '${filter}' export`;
export const command = dispatch => {
  let contextName = "";

  run().then(output => dispatch({ type: "tasks", output }));

  run("/usr/local/bin/task _get rc.context")
    .then(output => {
      if (output && output.length) {
        contextName = output;
        return run(`/usr/local/bin/task _get rc.context.${contextName}`);
      } else {
        return Promise.reject();
      }
    })
    .then(contextFilter => {
      console.log("Got context filter: ", contextFilter.trim());
      dispatch({ type: "context", contextFilter });
      let finalFilter;

      if (contextFilter.trim().length) {
        finalFilter = `(${contextFilter.trim()}) and ${filter}`;
      } else {
        finalFilter = filter;
      }
      console.log("Final filter: ", finalFilter);

      return run(`/usr/local/bin/task '${finalFilter}' export`);
    })
    .then(output => dispatch({ type: "tasks", output }));
};

export const initialState = {
  contextFilter: null,
  tasks: []
};

export const updateState = (event, prevState) => {
  switch (event.type) {
    case "tasks": {
      const tasks = JSON.parse(event.output).sort((a, b) => {
        return (Number(a.urgency) - Number(b.urgency)) * -1;
      });

      return { ...prevState, tasks };
    }
    case "context": {
      return { ...prevState, contextFilter: event.output };
    }
    default:
      return prevState;
  }
};

// render gets called after the shell command has executed. The command's output
// is passed in as a string.
export const render = ({ tasks }) => {
  return (
    <div>
      <h2>Tasks</h2>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Added</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
