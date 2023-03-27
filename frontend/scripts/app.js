async function start() {
    console.log('Starting app');

    loadState();
    createColorButtons();
    renderHistory();

    if (state.list_object !== null && state.list_object !== undefined) {
        await sync_state();

        renderList();

        setDisplay('list');
    } else {
        state.list_object = null;
        setDisplay('load');
    }
}

function renderHistory() {
    console.log("Rendering history");
    console.log(state);
    const el = document.getElementById('list-history');

    let divs = [];

    // Get last 5 lists
    let last_five = state.prev_lists.slice(state.prev_lists.length - 5);

    last_five.reverse();

    for (let i = 0; i < last_five.length; i++) {
        const div = document.createElement('button');
        div.classList.add('list-history-item');
        div.innerHTML = `${last_five[i].share_code} - ${last_five[i].name}`;

        div.addEventListener('click', () => {
            document.getElementById('load-share-code').value = last_five[i].share_code;
            loadShareCode();
        });

        divs.push(div);
    }

    el.innerHTML = '';

    for (let i = 0; i < divs.length; i++) {
        el.appendChild(divs[i]);
    }
}

function createColorButtons() {
    console.log('Creating color buttons');

    const el = document.getElementById('color-select');

    for (let i = 0; i < base_colors.length; i++) {
        const button = document.createElement('button');
        button.setAttribute("aria-label", `Choose Color #${base_colors[i]}`)
        button.classList.add('color-button');
        button.style.backgroundColor = chroma(base_colors[i]).darken(.2).hex();
        button.addEventListener('click', () => {
            localStorage.setItem('theme-color', i);
            setThemeColors();
        });

        el.appendChild(button);
    }
}

function setDisplay(display) {
    switch (display) {
        case 'load':
            console.log('Setting display to load');
            document.getElementById("create-load-screen").classList.remove("hidden");
            document.getElementById("list-screen").classList.add("hidden");
            break
        case 'list':
            console.log('Setting display to list');
            document.getElementById("create-load-screen").classList.add("hidden");
            document.getElementById("list-screen").classList.remove("hidden");
            break
    }
}

function loadState() {
    console.log('Loading state');

    let new_state = localStorage.getItem('state');

    if (new_state) {
        console.log('Found state in local storage');
        state = JSON.parse(new_state);
        console.log(new_state);
    }
}

function saveState() {
    console.log('Saving state');
    localStorage.setItem('state', JSON.stringify(state));
    processChange();
}

async function sync_state() {
    console.log('Syncing state');

    if (state.list_object === null) {
        return;
    }

    if (state.list_object.uuid == undefined) {
        return;
    }

    const server_response = await fetch(API_URL + '/list/' + state.list_object.uuid);

    if (server_response.status === 200) {
        console.log('Successfully synced state from server');
        const list_object = await server_response.json();

        if (state.list_object.last_updated >= list_object.last_updated) {
            console.log('Local state is newer than server state, pushing to server');
            await push_state();
        } else {
            console.log('Server state is newer than local state, pulling from server');
            state.list_object = list_object;
            renderList();
        }
    }
}

setInterval(() => {
    sync_state();
}
, 1000);

async function push_state() {
    console.log('Pushing state to server');
    const server_response = fetch(API_URL + '/list/update/' + state.list_object.uuid, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.list_object),
    });

    if (server_response.status === 200) {
        console.log('Successfully pushed state to server');
    }
}

async function loadShareCode() {
    console.log('Loading share code');
    const share_code = document.getElementById('load-share-code').value.trim().toUpperCase();
    const server_response = await fetch(API_URL + '/list/share_code/' + share_code);

    if (server_response.status === 200) {
        console.log('Successfully loaded share code');
        const list_object = await server_response.json();

        state.list_object = list_object;

        // Remove if in history, then add to top
        state.prev_lists = state.prev_lists.filter((prev) => prev.share_code !== share_code);

        state.prev_lists.push({
            name: state.list_object.name,
            share_code: state.list_object.share_code,
        });

        console.log(state.prev_lists);

        saveState();

        setDisplay('list');

        renderHistory();
        renderList();
    } else {
        if (!document.getElementById("load-share-code").classList.contains("error")) {
            document.getElementById("load-share-code").classList.add("error");

            setTimeout(() => {
                document.getElementById("load-share-code").classList.remove("error");
            }, 500);
        }
    }
}

async function createNewList() {
    console.log('Creating new list');
    const name = document.getElementById('create-list-name').value.trim();
    const server_response = await fetch(API_URL + '/list/create/' + name, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (server_response.status === 200) {
        console.log('Successfully created new list');
        const list_object = await server_response.json();

        state.list_object = list_object;

        state.prev_lists.push({
            name: state.list_object.name,
            share_code: state.list_object.share_code,
        });


        setDisplay('list');

        createNewListItem();
        renderHistory();
        renderList();

        saveState();
    }
}

function renderList() {
    console.log('Rendering list');
    console.time('renderList');

    const list_name = document.getElementById("list-name");

    list_name.value = state.list_object.name;
    list_name.addEventListener('change', () => {
        state.list_object.name = list_name.value;
        // Go through history and update name
        for (let prev of state.prev_lists) {
            if (prev.share_code === state.list_object.share_code) {
                prev.name = state.list_object.name;
            }
        }

        saveState();
    });


    document.getElementById("share-code").innerHTML = `Code: ${state.list_object.share_code}`;

    const list_container = document.getElementById('list-items');

    let header = generateListHeader();

    let list_els = [];

    for (let list_item of state.list_object.items) {
        list_els.push(createListItem(list_item));
    }

    let new_button = generateNewListItemButton();

    let switch_button = generateSwitchButton();

    let delete_all_button = generateDeleteAllCheckedButton();
    while (list_container.firstChild) {
        list_container.removeChild(list_container.firstChild);
    }

    list_container.appendChild(header);

    list_container.appendChild(delete_all_button);

    for (let list_el of list_els) {
        list_container.appendChild(list_el);
    }

    list_container.appendChild(new_button);
    list_container.appendChild(switch_button);

    console.timeEnd('renderList');
}

function deleteAllChecked() {
    console.log('Deleting all checked');
    let new_items = [];
    for (let list_item of state.list_object.items) {
        if (!list_item.crossed_off) {
            new_items.push(list_item);
        }
    }
    state.list_object.items = new_items;
    state.list_object.last_updated = new Date().getTime();

    saveState();
    renderList();
}

function generateListHeader() {
    let header = document.createElement('div');
    header.classList.add('list-item');
    header.classList.add('list-header');

    const head_text = ["Checked", "Name", "Quantity", "Delete"];

    for (let head of head_text) {
        let head_el = document.createElement('div');
        head_el.classList.add('list-item-header');
        head_el.innerHTML = head;
        header.appendChild(head_el);
    }

    return header;
}

function generateSwitchButton() {
    let button = document.createElement('button');
    button.innerText = 'Switch Lists';
    button.id = "switch-button";
    button.addEventListener('click', () => {
        clearData()
    });

    return button;
}

function generateDeleteAllCheckedButton() {
    let button = document.createElement('button');
    button.innerText = 'Delete All Checked';
    button.id = "delete-all-checked-button";
    button.addEventListener('click', () => {
        deleteAllChecked();
    });

    return button;
}

function clearData() {
    state.list_object = null;
    setDisplay('load'); 
}

function createListItem(list_item) {
    let item = document.createElement('div');
    item.classList.add('list-item');
    item.id = `list-item-${list_item.uuid}`;

    let check_box = document.createElement('input');
    check_box.setAttribute("aria-label", "Checked");
    check_box.type = 'checkbox';
    check_box.checked = list_item.crossed_off;

    let name_input = document.createElement('input');
    name_input.setAttribute("aria-label", "Name");
    name_input.type = 'text';
    name_input.value = list_item.name;
    name_input.classList.add("item-name");

    if (list_item.crossed_off) {
        name_input.classList.add("strikethrough");
    }

    name_input.addEventListener('change', () => {
        list_item.name = name_input.value;
        state.list_object.last_updated = new Date().getTime();
        saveState();
    });
    name_input.addEventListener('keydown', (e) => {
        // If enter is pressed WHILE it has focus,
        // create a new item
        if (e.keyCode === 13) {
            createNewListItem();
        }
    });
    
    check_box.addEventListener('change', () => {
        list_item.crossed_off = check_box.checked;
        name_input.classList.toggle("strikethrough");
        state.list_object.last_updated = new Date().getTime();

        saveState();
    });

    let quantity_input = document.createElement('input');
    quantity_input.setAttribute("aria-label", "Quantity");
    quantity_input.type = 'text';
    quantity_input.value = list_item.quantity;
    quantity_input.addEventListener('change', () => {
        list_item.quantity = quantity_input.value;
        state.list_object.last_updated = new Date().getTime();

        saveState();
    });
    quantity_input.addEventListener('keydown', (e) => {
        // If enter is pressed WHILE it has focus,
        // create a new item
        if (e.keyCode === 13) {
            createNewListItem();
        }
    });

    let delete_button = document.createElement('button');
    delete_button.setAttribute("aria-label", "Delete");
    delete_button.innerText = 'X';
    delete_button.classList.add("delete");
    delete_button.addEventListener('click', () => {
        deleteListItem(list_item.uuid);
    });

    item.appendChild(check_box);
    item.appendChild(name_input);
    item.appendChild(quantity_input);
    item.appendChild(delete_button);

    return item;
}

function generateNewListItemButton() {
    let button = document.createElement('button');
    button.innerText = 'Add item';
    button.id = "new-item-button";
    button.addEventListener('click', () => {
        createNewListItem();
    });

    return button;
}

async function createNewListItem() {
    console.log('Creating new list item');

    let new_item = await fetch(API_URL + '/list/item/create/' + state.list_object.uuid, {
        method: 'POST',
    });

    if (new_item.status === 200) {
        console.log('Successfully created new list item');
        const list_item = await new_item.json();

        state.list_object.items.push(list_item);
        state.list_object.last_updated = new Date().getTime();

        saveState();

        renderList();

        document.getElementById(`list-item-${list_item.uuid}`).scrollIntoView();

        document.getElementById(`list-item-${list_item.uuid}`).getElementsByClassName('item-name')[0].focus();


    }
}

function deleteListItem(uuid) {
    console.log('Deleting list item');

    state.list_object.items = state.list_object.items.filter(item => item.uuid !== uuid);
    state.list_object.last_updated = new Date().getTime();

    saveState();

    renderList();
}


function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const processChange = debounce(() => sync_state());


/*
START
*/
start();