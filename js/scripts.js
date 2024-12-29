document.addEventListener('DOMContentLoaded', () => {
    const teamNameInput = document.getElementById('team-name-input');
    const teamLogoInput = document.getElementById('team-logo-input');
    const teamNameDisplay = document.getElementById('team-name');
    const teamLogoDisplay = document.getElementById('team-logo');
    const saveOptionsButton = document.getElementById('save-options');
    const matchesList = document.getElementById('matches-list');
    const statMatchesSelect = document.getElementById('stat-matches');
    const assignForm = document.getElementById('assign-form');
    const assignTable = document.getElementById('assign-table').querySelector('tbody');
    const jerseysNotReturnedTable = document.getElementById('jerseys-not-returned').querySelector('tbody');
    const playersList = document.getElementById('players-list');
    const playerNameInput = document.getElementById('player-name-input');
    const exportPDFButton = document.getElementById('export-pdf');
    let currentMatchType = '';
    let isEditing = false;  // Variable para indicar si estamos en modo edición

    console.log('Script cargado y DOMContentLoaded disparado.');

    // Manejar el cambio de pestañas
    const tabs = document.querySelectorAll('.tab-link');
    const sections = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', event => {
            event.preventDefault();
            const targetTab = tab.getAttribute('data-tab');

            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active'); // Añadir clase active a la pestaña seleccionada
        });
    });

    // Mostrar la primera pestaña por defecto
    document.querySelector('.tab-link').click();

    // Función para guardar las opciones del equipo
    const saveTeamOptions = () => {
        const teamName = teamNameInput.value.toUpperCase();
        const teamLogo = teamLogoInput.files[0] ? URL.createObjectURL(teamLogoInput.files[0]) : null;
        localStorage.setItem('teamName', teamName);
        localStorage.setItem('teamLogo', teamLogo);
        updateTeamOptions();
    };

    // Función para actualizar las opciones del equipo
    const updateTeamOptions = () => {
        const teamName = localStorage.getItem('teamName');
        const teamLogo = localStorage.getItem('teamLogo');
        teamNameDisplay.textContent = teamName || 'NOMBRE DEL EQUIPO';
        teamLogoDisplay.src = teamLogo || 'default-logo.png';
        console.log('Opciones del equipo actualizadas:', { teamName, teamLogo });
    };

    // Función para cargar los partidos guardados
    const loadMatches = () => {
        const matches = JSON.parse(localStorage.getItem('matches') || '[]');
        matches.sort((a, b) => b.date.localeCompare(a.date)); // Ordenar por fecha, más reciente primero
        matchesList.innerHTML = matches.map(match => `
            <li data-id="${match.id}">
                <span>${match.name} - ${match.date} - ${match.time}</span>
                <button onclick="editMatch('${match.id}')">EDITAR</button>
                <button class="delete-button" onclick="deleteMatch('${match.id}')">ELIMINAR</button>
            </li>
        `).join('');
        console.log('Partidos cargados:', matches);
        // Actualizar la selección de estadísticas
        statMatchesSelect.innerHTML = '<option value="ALL">TODOS</option>' + matches.map(match => `
            <option value="${match.id}">${match.name}</option>
        `).join('');
        // Seleccionar por defecto la opción "TODOS"
        statMatchesSelect.querySelector('option[value="ALL"]').selected = true;
        calculateStatistics(); // Mostrar estadísticas para todos los partidos por defecto
    };

    // Función para generar un identificador único para cada partido basado en fecha y hora
    const generateMatchId = () => {
        const now = new Date();
        return now.getFullYear().toString().slice(-2) + 
               ('0' + (now.getMonth() + 1)).slice(-2) + 
               ('0' + now.getDate()).slice(-2) + 
               ('0' + now.getHours()).slice(-2) + 
               ('0' + now.getMinutes()).slice(-2) + 
               ('0' + now.getSeconds()).slice(-2);
    };

    // Función para editar un partido
    const editMatch = (matchId) => {
        const matches = JSON.parse(localStorage.getItem('matches') || '[]');
        const match = matches.find(m => m.id === matchId);

        if (match) {
            console.log('Editando partido:', match); // Comprobación adicional

            document.getElementById('match-id').value = match.id;
            document.getElementById('match-name').value = match.name;
            document.getElementById('match-date').value = match.date;
            document.getElementById('match-time').value = match.time;

            currentMatchType = match.type;
            generatePositions(match.type);

            match.players.forEach((player, index) => {
                document.getElementById(`player-${index + 1}`).value = player.player;
                document.getElementById(`jersey-${index + 1}`).value = player.jersey;
                document.getElementById(`return-game-${index + 1}`).value = player.returnGame;
                document.getElementById(`warmup-jersey-${index + 1}`).value = player.warmupJersey;
                document.getElementById(`return-warmup-${index + 1}`).value = player.returnWarmup;
                document.getElementById(`entry-minute-${index + 1}`).value = player.entryMinute;
                document.getElementById(`exit-minute-${index + 1}`).value = player.exitMinute;
                document.getElementById(`total-minutes-${index + 1}`).value = player.totalMinutes;
                document.getElementById(`comments-${index + 1}`).value = player.comments;
            });

            console.log('Datos del formulario actualizados');

            // Simular un clic en la pestaña "Asignar Camisetas" para cambiar de pestaña
            const targetTab = document.querySelector('[data-tab="asignar-camisetas"]');
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            targetTab.classList.add('active');
            document.getElementById('asignar-camisetas').classList.add('active');
            isEditing = true;  // Establecer modo edición
        } else {
            console.error('Partido no encontrado:', matchId);
        }
    };

    // Función para eliminar un partido
    const deleteMatch = (matchId) => {
        let matches = JSON.parse(localStorage.getItem('matches') || '[]');
        matches = matches.filter(m => m.id !== matchId);
        localStorage.setItem('matches', JSON.stringify(matches));
        console.log('Partido eliminado:', matchId);
        loadMatches(); // Recargar la lista de partidos
        calculateStatistics(); // Actualizar estadísticas
        checkPendingJerseys(matches); // Actualizar camisetas pendientes de devolución
    };

    // Función para guardar un partido
    const saveMatch = () => {
        const matchName = document.getElementById('match-name').value.toUpperCase();
        const matchDate = document.getElementById('match-date').value;
        const matchTime = document.getElementById('match-time').value;

        if (!matchName || !matchDate || !matchTime) {
            alert('Por favor, completa todos los campos requeridos.');
            return;
        }

        const matchId = document.getElementById('match-id').value || generateMatchId(); // Generar nuevo ID si no estamos editando
        let matches = JSON.parse(localStorage.getItem('matches') || '[]');
        let match;
        const existingMatchIndex = matches.findIndex(m => m.id === matchId);

        if (existingMatchIndex !== -1 && isEditing) {
            // Actualizar partido existente
            matches[existingMatchIndex].name = matchName;
            matches[existingMatchIndex].date = matchDate;
            matches[existingMatchIndex].time = matchTime;
            matches[existingMatchIndex].type = currentMatchType;
            matches[existingMatchIndex].players = []; // Limpiar jugadores antiguos
            match = matches[existingMatchIndex];
        } else {
            // Nuevo partido
            match = {
                id: matchId,
                name: matchName,
                date: matchDate,
                time: matchTime,
                type: currentMatchType,
                players: []
            };
            matches.push(match);
            isEditing = false;  // Salir del modo edición
        }

        // Iterar sobre las filas de la tabla para agregar datos de los jugadores
        const rows = assignTable.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const player = document.getElementById(`player-${index + 1}`)?.value.toUpperCase() || '';
            const jersey = document.getElementById(`jersey-${index + 1}`)?.value.toUpperCase() || '';
            const returnGame = document.getElementById(`return-game-${index + 1}`)?.value.toUpperCase() || 'NO';
            const warmupJersey = document.getElementById(`warmup-jersey-${index + 1}`)?.value.toUpperCase() || '';
            const returnWarmup = document.getElementById(`return-warmup-${index + 1}`)?.value.toUpperCase() || 'NO';
            const entryMinute = parseInt(document.getElementById(`entry-minute-${index + 1}`)?.value) || 0;
            const exitMinute = parseInt(document.getElementById(`exit-minute-${index + 1}`)?.value) || 0;
            const totalMinutes = parseInt(document.getElementById(`total-minutes-${index + 1}`)?.value) || 0;
            const comments = document.getElementById(`comments-${index + 1}`)?.value.toUpperCase() || '';

            match.players.push({
                player,
                jersey,
                returnGame,
                warmupJersey,
                returnWarmup,
                entryMinute,
                exitMinute,
                totalMinutes,
                comments
            });
        });

        localStorage.setItem('matches', JSON.stringify(matches));
        loadMatches();
        calculateStatistics(); // Actualizar estadísticas
        checkPendingJerseys(matches); // Actualizar camisetas pendientes de devolución
        resetAssignForm(); // Limpiar el formulario de asignar camisetas después de guardar
        document.querySelector('[data-tab="partidos"]').click(); // Redirigir automáticamente a la pestaña Partidos
    };

    // Función para generar posiciones y tabla
    const generatePositions = (type) => {
        currentMatchType = type; // Guardar el tipo de partido actual
        assignTable.innerHTML = ''; // Limpiar tabla
        let positions = type === 'rugby15' ? 23 : 15; // Generar 23 para rugby15 y 15 para rugby7 (7 titulares y 8 suplentes)
        for (let i = 1; i <= positions; i++) {
            let row = assignTable.insertRow();
            row.innerHTML = `
                <td>${i}</td>
                <td><select id="player-${i}" onchange="handlePlayerChange()"><option value="">Seleccionar Jugador</option>${getPlayersOptions()}</select></td>
                <td><select id="jersey-${i}" onchange="handleJerseyChange()"><option value="">Seleccionar Camiseta</option>${getJerseysOptions()}</select></td>
                <td><select id="return-game-${i}"><option value="NO">NO</option><option value="SI">SI</option><option value="PERDIDA">PERDIDA</option></select></td>
                <td><select id="warmup-jersey-${i}" onchange="handleWarmupJerseyChange()"><option value="">Seleccionar Camiseta</option>${getJerseysOptions()}</select></td>
                <td><select id="return-warmup-${i}"><option value="NO">NO</option><option value="SI">SI</option><option value="PERDIDA">PERDIDA</option></select></td>
                <td><select id="entry-minute-${i}" onchange="updateTotalMinutes(${i})">${[...Array(81).keys()].map(n => `<option value="${n}">${n}</option>`).join('')}</select></td>
                <td><select id="exit-minute-${i}" onchange="updateTotalMinutes(${i})">${[...Array(81).keys()].map(n => `<option value="${n}">${n}</option>`).join('')}</select></td>
                <td><input type="number" id="total-minutes-${i}" readonly></td>
                <td><input type="text" id="comments-${i}" placeholder="Comentarios"></td>
            `;
        }
        // Actualizar las opciones para evitar duplicidades
        updateDropdownOptions('player');
        updateDropdownOptions('jersey');
        updateDropdownOptions('warmup-jersey');
    };

    // Función para actualizar los minutos totales
    const updateTotalMinutes = (index) => {
        const entryMinute = parseInt(document.getElementById(`entry-minute-${index}`).value);
        const exitMinute = parseInt(document.getElementById(`exit-minute-${index}`).value);
        const totalMinutes = exitMinute - entryMinute;
        document.getElementById(`total-minutes-${index}`).value = totalMinutes >= 0 ? totalMinutes : 0;
    };

    // Función para resetear el formulario de asignar camisetas
    const resetAssignForm = () => {
        document.getElementById('assign-form').reset();
        assignTable.innerHTML = '';
        isEditing = false;  // Salir del modo edición
    };

    // Función para obtener opciones de jugadores
    const getPlayersOptions = () => {
        const players = JSON.parse(localStorage.getItem('players') || '[]');
        players.sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente
        return players.map(player => `<option value="${player.name}">${player.name}</option>`).join('');
    };

    // Función para obtener opciones de camisetas
    const getJerseysOptions = () => {
        return [...Array(99).keys()].map(n => `<option value="${n + 1}">${n + 1}</option>`).join('');
    };

    // Función para añadir un jugador
    const addPlayer = () => {
        const playerName = playerNameInput.value.toUpperCase();
        if (playerName) {
            const players = JSON.parse(localStorage.getItem('players') || '[]');
            players.push({ name: playerName, position: 'unknown', minutesPlayed: 0 });
            localStorage.setItem('players', JSON.stringify(players));
            playerNameInput.value = '';
            loadPlayers();
        }
    };

    // Función para cargar los jugadores guardados y ordenarlos alfabéticamente
    const loadPlayers = () => {
        let players = JSON.parse(localStorage.getItem('players') || '[]');
        players.sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente
        playersList.innerHTML = players.map(player => `
            <li>${player.name} <button onclick="editPlayer('${player.name}')">EDITAR</button> <button onclick="removePlayer('${player.name}')">ELIMINAR</button></li>
        `).join('');
        console.log('Jugadores cargados:', players);
    };

    // Función para editar un jugador
    const editPlayer = (playerName) => {
        const newName = prompt('Nuevo nombre del jugador:', playerName.toUpperCase());
        if (newName) {
            let players = JSON.parse(localStorage.getItem('players') || '[]');
            const player = players.find(player => player.name === playerName);
            if (player) {
                player.name = newName.toUpperCase();
                localStorage.setItem('players', JSON.stringify(players));
                loadPlayers();
            }
        }
    };

    // Función para eliminar un jugador
    const removePlayer = (playerName) => {
        let players = JSON.parse(localStorage.getItem('players') || '[]');
        players = players.filter(player => player.name !== playerName);
        localStorage.setItem('players', JSON.stringify(players));
        loadPlayers();
    };

    // Función para calcular estadísticas
    const calculateStatistics = () => {
        const matches = JSON.parse(localStorage.getItem('matches') || '[]');
        const players = JSON.parse(localStorage.getItem('players') || '[]');
        const selectedMatchIds = Array.from(statMatchesSelect.selectedOptions).map(option => option.value);

        let selectedMatches;
        if (selectedMatchIds.includes('ALL')) {
            selectedMatches = matches;
        } else {
            selectedMatches = matches.filter(match => selectedMatchIds.includes(match.id.toString()));
        }

        players.forEach(player => {
            player.totalMinutes = 0;
            player.gamesPlayed = 0;
            player.timesStarter = 0;

            selectedMatches.forEach(match => {
                const matchPlayer = match.players.find(p => p.player === player.name);
                if (matchPlayer) {
                    player.totalMinutes += matchPlayer.totalMinutes;
                    player.gamesPlayed += 1;
                    const isStarter = match.type === 'rugby15' ? match.players.indexOf(matchPlayer) < 15 : match.players.indexOf(matchPlayer) < 7;
                    player.timesStarter += isStarter ? 1 : 0;
                }
            });

            player.averageMinutes = player.gamesPlayed ? player.totalMinutes / player.gamesPlayed : 0;
        });

        players.sort((a, b) => b.totalMinutes - a.totalMinutes);
        displayStatistics(players);
    };

    // Función para mostrar estadísticas
    const displayStatistics = (players) => {
        const statsTableBody = document.getElementById('statistics-table').querySelector('tbody');
        statsTableBody.innerHTML = players.map(player => `
            <tr>
                <td>${player.name}</td>
                <td>${player.totalMinutes}</td>
                <td>${player.averageMinutes.toFixed(2)}</td>
                <td>${player.gamesPlayed}</td>
                <td>${player.timesStarter}</td>
            </tr>
        `).join('');
        console.log('Estadísticas mostradas:', players);
    };

    // Función para verificar camisetas pendientes de devolución
    const checkPendingJerseys = (matches) => {
        const pendingJerseys = matches.flatMap(match => match.players.flatMap(player => {
            const pendingItems = [];
            if (player.jersey && player.returnGame === 'NO') {
                pendingItems.push({
                    player: player.player,
                    jersey: player.jersey,
                    type: 'Juego',
                    matchName: match.name,
                    matchDate: match.date
                });
            }
            if (player.warmupJersey && player.returnWarmup === 'NO') {
                pendingItems.push({
                    player: player.player,
                    jersey: player.warmupJersey,
                    type: 'Calentamiento',
                    matchName: match.name,
                    matchDate: match.date
                });
            }
            return pendingItems;
        }));

        jerseysNotReturnedTable.innerHTML = pendingJerseys.map(item => `
            <tr>
                <td><button onclick="confirmReturnJersey('${item.player}', '${item.jersey}', '${item.matchName}', '${item.matchDate}', '${item.type}')">ENTREGAR</button></td>
                <td>${item.player}</td>
                <td>${item.type}</td>
                <td>${item.jersey}</td>
                <td>${item.matchName}</td>
                <td>${item.matchDate}</td>
            </tr>
        `).join('');
        console.log('Camisetas pendientes de devolución:', pendingJerseys);
    };

    // Función para confirmar y devolver una camiseta
    const confirmReturnJersey = (playerName, jerseyNumber, matchName, matchDate, type) => {
        const confirmMessage = `DEVOLVER CAMISETA: ${playerName} - ${type} - ${jerseyNumber}`;
        if (confirm(confirmMessage)) {
            returnJersey(playerName, jerseyNumber, matchName, matchDate, type);
        }
    };

    // Función para marcar una camiseta como devuelta
    const returnJersey = (playerName, jerseyNumber, matchName, matchDate, type) => {
        const matches = JSON.parse(localStorage.getItem('matches') || '[]');
        const match = matches.find(m => m.name === matchName && m.date === matchDate);
        const player = match.players.find(p => p.player === playerName);

        if (type === 'Juego') {
            player.returnGame = 'SI';
        } else if (type === 'Calentamiento') {
            player.returnWarmup = 'SI';
        }

        localStorage.setItem('matches', JSON.stringify(matches));
        checkPendingJerseys(matches); // Actualizar la lista de camisetas pendientes de devolución
    };

    // Función para exportar los datos a PDF
    const exportarPDF = () => {
        const activeSection = document.querySelector('.tab-content.active');
        if (activeSection) {
            const activeSectionId = activeSection.id;
            exportToPDF(activeSectionId, `${activeSectionId}.pdf`);
        } else {
            alert('No se encontró ninguna sección activa.');
        }
    };

    const exportToPDF = (sectionId, fileName) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const section = document.getElementById(sectionId);

        html2canvas(section).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;

            let position = 0;

            doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save(fileName);
        });
    };

    // Función para manejar cambios en la lista de jugadores
    const handlePlayerChange = () => {
        updateDropdownOptions('player');
    };

    // Función para manejar cambios en la lista de camisetas de juego
    const handleJerseyChange = () => {
        updateDropdownOptions('jersey');
    };

    // Función para manejar cambios en la lista de camisetas de calentamiento
    const handleWarmupJerseyChange = () => {
        updateDropdownOptions('warmup-jersey');
    };

    // Función para actualizar opciones de los menús desplegables y evitar duplicados
    const updateDropdownOptions = (type) => {
        // Obtener todas las opciones seleccionadas
        const selectedValues = new Set();
        document.querySelectorAll(`[id^=${type}-]`).forEach(element => {
            const value = element.value;
            if (value) {
                selectedValues.add(value);
            }
        });

        // Actualizar todas las listas desplegables
        document.querySelectorAll(`[id^=${type}-]`).forEach(element => {
            if (element && element.options) {
                const options = element.options;
                for (let i = 0; i < options.length; i++) {
                    options[i].hidden = selectedValues.has(options[i].value);
                }
            }
        });
    };

    // Inicializar la aplicación
    saveOptionsButton.addEventListener('click', saveTeamOptions);
    exportPDFButton.addEventListener('click', exportarPDF);
    statMatchesSelect.addEventListener('change', () => {
        const allOption = statMatchesSelect.querySelector('option[value="ALL"]');
        if (allOption.selected) {
            for (const option of statMatchesSelect.options) {
                option.selected = true;
            }
        }
        calculateStatistics();
    });

    // Cargar datos iniciales
    loadMatches();
    loadPlayers();
    updateTeamOptions();
    checkPendingJerseys(JSON.parse(localStorage.getItem('matches') || '[]')); // Verificar camisetas pendientes al cargar la página
    calculateStatistics(); // Calcular estadísticas por defecto

    // Hacer accesibles las funciones desde el ámbito global
    window.addPlayer = addPlayer;
    window.editPlayer = editPlayer;
    window.removePlayer = removePlayer;
    window.generatePositions = generatePositions;
    window.resetAssignForm = resetAssignForm;
    window.saveMatch = saveMatch;
    window.updateTotalMinutes = updateTotalMinutes;
    window.returnJersey = returnJersey;
    window.confirmReturnJersey = confirmReturnJersey;
    window.exportarPDF = exportarPDF;
    window.checkPendingJerseys = checkPendingJerseys;
    window.editMatch = editMatch;
    window.deleteMatch = deleteMatch; // Asegurarse de que deleteMatch esté disponible globalmente
    window.handlePlayerChange = handlePlayerChange;
    window.handleJerseyChange = handleJerseyChange;
    window.handleWarmupJerseyChange = handleWarmupJerseyChange;

    console.log('Aplicación inicializada correctamente');
});
