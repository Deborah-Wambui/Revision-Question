/**
 * IST4035 - Advanced Web Design & Applications
 * Core logic for FocusTasks (SID4: 7533)
 */

const SID4 = '7533';
const STORAGE_KEY = `focustasks_${SID4}`;

// --- Task 2: XSS Safety Function ---

/**
 * Escapes HTML characters in a string to prevent Cross-Site Scripting (XSS).
 * @param {string} str The user-supplied task title.
 * @returns {string} The safe, escaped string.
 */
const escapeHTML = (str) => {
    // 1. Point to the exact escaping line and explain why it’s sufficient here (client-only) but
    //    insufficient in server-rendered or multi-user contexts.

    // This is the exact escaping line (L19). It converts symbols like < and > into harmless HTML entities.
    // It's SUFFICIENT here because this is a single-user, client-only application. 
    // All content is generated and consumed locally. 
    // It is INSUFFICIENT in server-rendered or multi-user contexts, where a server must perform 
    // escaping before storing or sending data, and a strong Content Security Policy (CSP) must 
    // be implemented to protect against other injection vectors.
    return str.replace(/[&<>"']/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
};

// --- Task 2: Closure Store API (`createStore`) ---

/**
 * Creates the store API using a closure for state encapsulation and persistence.
 * @param {string} storageKey The key used for localStorage.
 * @returns {object} The task store API ({ add, toggle, remove, list }).
 */
const createStore = (storageKey) => {
    let tasks = []; // Private, encapsulated state (no global 'tasks' variable)

    // 2. Why the closure store improves testability and avoids accidental mutation vs. globals.

    // Using a closure here improves **testability** because each call to createStore() 
    // produces a completely isolated instance, making it easy to set up and tear down 
    // test data without affecting other tests. It avoids **accidental mutation** because
    // the 'tasks' array is private and can only be changed using the controlled methods 
    // (add, toggle, remove), ensuring state integrity.

    // Helper: Saves the current tasks state to localStorage.
    const persist = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(tasks));
        } catch (e) {
            console.error("Persistence failed:", e);
        }
    };

    // Helper: Loads state from localStorage on initialization.
    const hydrate = () => {
        try {
            const data = localStorage.getItem(storageKey);
            if (data) {
                tasks = JSON.parse(data);
            }
        } catch (e) {
            console.error("Hydration failed; starting with empty state.", e);
            tasks = [];
        }
    };

    hydrate(); // Initialize the store state immediately

    // Helper: Updates state and persists it.
    const commit = (newTasks) => {
        tasks = newTasks;
        persist();
        return tasks;
    };

    return {
        /** Adds a new task object to the state. */
        add: (task) => {
            // Task 2 Constraint: No loops. Use spread syntax to create a new array.
            const newTasks = [...tasks, task]; 
            return commit(newTasks);
        },

        /** Toggles the 'done' status for a task by ID. */
        toggle: (id) => {
            // Task 2 Constraint: Use map for array transformation.
            const newTasks = tasks.map(task => 
                (task.id === id) ? { ...task, done: !task.done } : task
            );
            return commit(newTasks);
        },

        /** Removes a task by ID. */
        remove: (id) => {
            // Task 2 Constraint: Use filter for array removal.
            const newTasks = tasks.filter(task => task.id !== id);
            return commit(newTasks);
        },

        /** Returns a deep-cloned copy of the current state. */
        list: () => {
            // Task 2 Constraint: Use map to return shallow clones, which is sufficient 
            // to prevent external manipulation of object references in this case.
            return tasks.map(task => ({ ...task }));
        }
    };
};

// Must exist with this exact shape:
const store = createStore(STORAGE_KEY); 

// --- Task 3: Analytics Pure Function ---

/**
 * Calculates active, done counts, and completion percentage.
 * This is a pure function (no side effects, output depends only on input).
 * @param {Array<object>} tasks - The task array from store.list().
 * @returns {object} Summary object.
 */
const summarize = (tasks) => {
    // Task 2 Constraint: Use reduce for aggregation.
    const summary = tasks.reduce((acc, task) => {
        task.done ? acc.done++ : acc.active++;
        return acc;
    }, { active: 0, done: 0 });

    const total = summary.active + summary.done;
    
    // Calculate percentage, handling division by zero
    const pct = (total > 0) 
        // Rounds to 1 decimal place (multiply by 1000, round, then divide by 10)
        ? Math.round((summary.done / total) * 1000) / 10 
        : 0.0;

    return { 
        active: summary.active, 
        done: summary.done, 
        pct: pct.toFixed(1) // Format as string for display
    };
};

// --- DOM and Rendering ---

const activeListEl = document.getElementById('active-tasks-list');
const doneListEl = document.getElementById('done-tasks-list');
const analyticsEl = document.getElementById('analytics-area');
const formEl = document.getElementById('add-task-form');
const inputEl = document.getElementById('new-task-title');
const validationEl = document.getElementById('validation-message');
const listsContainerEl = document.querySelector('.lists-container'); // Common parent for delegation

/**
 * Renders the full UI and updates analytics. Called after every state mutation.
 */
const renderApp = () => {
    const tasks = store.list();
    
    // Use filter to separate lists (Task 2 constraint)
    const activeTasks = tasks.filter(task => !task.done);
    const doneTasks = tasks.filter(task => task.done);
    
    // Render the lists
    activeListEl.innerHTML = activeTasks.map(createTaskHTML).join('');
    doneListEl.innerHTML = doneTasks.map(createTaskHTML).join('');

    // Task 3: Render live analytics in the header
    const summary = summarize(tasks);
    analyticsEl.textContent = `Active: ${summary.active} · Done: ${summary.done} · Done %: ${summary.pct}%`;
};

/**
 * Creates the HTML string for a single task item.
 * @param {object} task - The task object.
 * @returns {string} The HTML string.
 */
const createTaskHTML = (task) => {
    // Task 2: IMPORTANT: Use the escapeHTML function to ensure safety here.
    const safeTitle = escapeHTML(task.title); 
    const toggleButtonText = task.done ? 'Re-Activate' : 'Complete';
    
    // data-action and data-id are used for event delegation lookup
    return `
        <li data-id="${task.id}" class="${task.done ? 'task-done' : ''}">
            <span class="task-content">${safeTitle}</span>
            <div>
                <button type="button" class="btn-toggle" data-action="toggle" data-id="${task.id}">${toggleButtonText}</button>
                <button type="button" class="btn-delete" data-action="delete" data-id="${task.id}">Delete</button>
            </div>
        </li>
    `;
};

// --- Task 3: Event Handlers and Delegation ---

/**
 * Generates a unique ID (timestamp + random suffix).
 */
const generateUniqueId = () => {
    // Simple, unique client-side ID for this demo
    return Date.now().toString() + Math.random().toString(36).substring(2, 6);
};

/**
 * Handles the form submission for adding a new task.
 */
const handleAddTask = (event) => {
    event.preventDefault();
    
    const title = inputEl.value.trim();
    
    // Task 2: Validation check
    if (!title) {
        validationEl.textContent = "Please enter a title (cannot be empty or just spaces).";
        inputEl.focus();
        return;
    }

    // Clear validation message on success
    validationEl.textContent = "";

    const newTask = {
        id: generateUniqueId(),
        title: title,
        done: false
    };

    store.add(newTask);
    inputEl.value = ''; // Clear input
    inputEl.focus();
    renderApp();
};

/**
 * Handles click events on the task lists via delegation.
 * (Single delegated listener on each UL element: activeListEl and doneListEl)
 */
const handleListAction = (event) => {
    const target = event.target;
    
    // Check if the clicked element has an action we care about
    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');

    if (action && id) {
        if (action === 'toggle') {
            store.toggle(id);
        } else if (action === 'delete') {
            store.remove(id);
        }
        renderApp(); // Update UI after any mutation
    }
};


// --- Initialization: Attach Listeners ---

// Listener 1: Form submission (Task 3: Delegation for add)
formEl.addEventListener('submit', handleAddTask);

// Listener 2 & 3: List actions (Task 3: Delegation for toggle/delete)
// Attaching to the two UL elements is the clearest form of delegation for these distinct areas.
activeListEl.addEventListener('click', handleListAction);
doneListEl.addEventListener('click', handleListAction);


// Start the application after the DOM is ready
document.addEventListener('DOMContentLoaded', renderApp);
