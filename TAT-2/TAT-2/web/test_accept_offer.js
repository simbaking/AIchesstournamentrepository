async function run() {
    try {
        console.log("Creating test1 player...");
        let r1 = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'test1', isComputer: false })
        });
        console.log(await r1.json());
        
        console.log("Creating test2 player...");
        let r2 = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'test2', isComputer: false })
        });
        console.log(await r2.json());

        console.log("Starting tournament...");
        const resStart = await fetch('http://localhost:3000/api/start', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationMinutes: 60 })
        });
        console.log("Start tournament result:", await resStart.json());

        console.log("Creating offer for test1...");
        const res3 = await fetch('http://localhost:3000/api/offers/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player1: 'test1', timeControl: '5', increment: 0, variant: 'standard', startPos: 'random', cooldown: 10 })
        });
        const createRes = await res3.json();
        console.log("Create result:", createRes);
        
        if (createRes.success) {
            console.log("Accepting offer as test2...");
            const res4 = await fetch('http://localhost:3000/api/offers/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: createRes.offerId, player2: 'test2' })
            });
            const acceptRes = await res4.json();
            console.log("Accept result:", acceptRes);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
