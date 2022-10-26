const actions = document.getElementsByClassName("BookActions");

const first = actions.item(0);
if (!first) {
    console.error("unable to locate book actions");
    return;
}
