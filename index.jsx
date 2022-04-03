import { run, React } from "uebersicht";
import { formatDistanceToNow } from "date-fns";
import _ from "lodash";
import feather from "feather-icons";

// This is a simple example Widget to get you started with Übersicht.
// For the full documentation please visit:
// https://github.com/felixhageloh/uebersicht

// You can modify this widget as you see fit, or simply delete this file to
// remove it.

// this is the shell command that gets executed every time this widget refreshes

// the refresh frequency in milliseconds
export const refreshFrequency = 120000;

const URL_REGEX =
  /(?:[--:\w?@%&+~#=]*\.[a-z]{2,4}\/{0,2})(?:(?:[?&](?:\w+)=(?:\w+))+|[--:\w?@%&+~#=]+)/;

const parseTaskWarriorDate = (twDate) => {
  const year = Number(twDate.substring(0, 4));
  const month = Math.max(Number(twDate.substring(4, 6)) - 1, 0);
  const day = Number(twDate.substring(6, 8));
  const hour = Number(twDate.substring(9, 11));
  const minute = Number(twDate.substring(11, 13));
  const second = Number(twDate.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

// the CSS style for this widget, written using Emotion
// https://emotion.sh/
export const className = `
  --bar-height: 40px;

  top: 10px;
  left: 10px;
  height: var(--bar-height);
  width: calc(100vw - 20px);
  box-sizing: border-box;
  margin: auto;
  padding: 0;
  background-color: rgba(255, 255, 255, 0.7);
  background-repeat: no-repeat;
  background-size: 176px 84px;
  background-position: 50% 20px;
  -webkit-backdrop-filter: blur(20px);
  color: #2B2D42;
  font-family: "Overpass Mono";
  font-weight: 400;
  text-align: left;
  line-height: 1.5;
  border-radius: 10px;
  font-size: 13px;

  .ubertask {
    display: flex;
    justify-content: stretch;
    flex-direction: row-reverse;
    height: 100%;
    overflow: hidden;
  }

  .urgency {
    text-align: right;
  }

  .task-row {
    display: flex;
    flex: 1;
    position: relative;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    padding: 10px 10px 10px 43px;
    z-index: 1;

    &:last-child {
      border-right: none;
    }
  }

  .task-row-chevron {
    height: var(--bar-height);
    width: var(--bar-height);
    position: absolute;
    right: -20px;
    background-color: inherit;
    transform: rotate(45deg);
    z-index: 0;

    box-shadow: 3px -3px 3px rgba(43, 45, 66, 0.15);
  }

  .task-age, .task-due {
    margin-left: 10px;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-grow: 1;
    flex-shrink: 1;
  }

  .task-description {
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 65%;
  }

  .task-row:first-child .task-row-chevron {
    display: none;
  }

  .feather-icon {
    margin: 5px;
    flex-shrink: 0;
  }

  .task-row:last-child {
    background-color: #B10F2E;
    color: #FDFFFF;
    border-radius: 10px 0 0 10px;
    padding-left: 10px;

    a {
      color: #91A6FF;
    }
  }
`;

const conciseAge = (age) => {
  return age
    .replace("about ", "~")
    .replace(/less than a /, "<1 ")
    .replace(/less than /, "<")
    .replace("hour", "hr")
    .replace("minute", "min")
    .replace("week", "wk")
    .replace("second", "sec")
    .replace("month", "mth");
};

const TaskRow = ({ task: { description, entry, due } }) => {
  const dateAdded = entry ? parseTaskWarriorDate(entry) : "";
  const dateDue = due ? parseTaskWarriorDate(due) : "";
  const taskDescription = _.truncate(description, {
    length: 42,
    separator: /\s+/,
    omission: "… ",
  });

  const links = (description.match(URL_REGEX) || []).map((u) => (
    <a key={u} href={u}>
      [Link]
    </a>
  ));

  const fragments = taskDescription
    .split(URL_REGEX)
    .map((t) => <span key={t}>{t}</span>);

  const descriptionContent = _.zip(fragments, links).flat();

  return (
    <div className={"task-row"}>
      <div className="task-row-chevron"></div>
      <div className="task-description">{descriptionContent}</div>
      {due && (
        <div className="task-due">
          <i className="feather-icon" data-feather="calendar" />
          {`${entry && conciseAge(formatDistanceToNow(dateDue))}`}
        </div>
      )}
      <div className="task-age">
        <i className="feather-icon" data-feather="clock" />
        {`${entry && conciseAge(formatDistanceToNow(dateAdded))}`}
      </div>
    </div>
  );
};

const filter = "(status:pending or status:active) and -BLOCKED";

// export const command = `/usr/local/bin/task '${filter}' export`;
export const command = (dispatch) => {
  let contextName = "";
  console.log("Running command");

  run("/usr/local/bin/task _get rc.context")
    .then((output) => {
      if (output && output.length) {
        contextName = output;
        return run(`/usr/local/bin/task _get rc.context.${contextName}`);
      } else {
        return Promise.reject();
      }
    })
    .then((contextFilter) => {
      dispatch({ type: "context", contextFilter });
      let finalFilter;

      if (contextFilter.trim().length) {
        finalFilter = `(${contextFilter.trim()}) and ${filter}`;
      } else {
        finalFilter = filter;
      }

      return run(`/usr/local/bin/task '${finalFilter}' export`);
    })
    .then((output) => dispatch({ type: "tasks", output }));
};

export const initialState = {
  contextFilter: null,
  tasks: [],
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

const UberTask = ({ tasks }) => {
  const tasksToRender = tasks.slice(0, 5).reverse();

  React.useLayoutEffect(() => {
    feather.replace({ height: "14px", width: "14px" });
  }, [tasks]);

  return (
    <div className="ubertask">
      {tasksToRender.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
    </div>
  );
};

// render gets called after the shell command has executed. The command's output
// is passed in as a string.
export const render = ({ tasks }) => {
  return <UberTask tasks={tasks} />;
};
