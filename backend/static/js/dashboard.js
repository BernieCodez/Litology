async function loadDashboard(){
    const response = await fetch(
        "http://127.0.0.1:8000/api/dashboard/"
    );

    const data = await response.json();

    console.log(data);

}

loadDashboard();
