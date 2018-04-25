const electron = require('electron');
const url = require('url');
const path = require('path');
const os = require('os');
const si = require('systeminformation');
const fs = require("fs");
var AutoLaunch = require('auto-launch');
var request = require('request');


const {app, Tray, Menu, powerSaveBlocker, BrowserWindow, ipcMain} = electron;
powerSaveBlocker.start('prevent-app-suspension');

const iconPath = path.join(__dirname, 'icon.png');
const iconLargePath = path.join(__dirname, 'icon_large.png');

var agentAutoLauncher = new AutoLaunch({
    name: 'nMon Agent',
});
agentAutoLauncher.enable();
agentAutoLauncher.isEnabled()
.then(function(isEnabled){
    if(isEnabled){
        return;
    }
    agentAutoLauncher.enable();
})
.catch(function(err){
    //handle error
});


let mainWindow;

// Listen for the app to be ready
app.on('ready', function(){

    //function createMainWindow() {

        serverkey_file = fs.readFileSync(path.join(__dirname, 'serverkey.txt'));
        serverkey = serverkey_file.toString();

        showOnStart = false;

        if(serverkey.length < 5) showOnStart = true;

        // Create main window
        mainWindow = new BrowserWindow({
            width: 500,
            height: 360,
            center: true,
            minimizable: false,
            maximizable: false,
            show: showOnStart,
            icon: iconLargePath
        });

        // Load HTML into main window
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'mainWindow.html'),
            protocol: 'file:',
            slashes: true
        }));

        // Prevent quit on main window close
        mainWindow.on("close", function(e){
            e.sender.hide();
            e.preventDefault();
        });

        mainWindow.on("show", function(e){
            serverkey_file = fs.readFileSync(path.join(__dirname, 'serverkey.txt'));
            serverkey = serverkey_file.toString();

            gateway_file = fs.readFileSync(path.join(__dirname, 'gateway.txt'));
            gateway = gateway_file.toString();

            mainWindow.webContents.send("config:show", [serverkey, gateway]);
        });


    //}

    // Catch config:save
    ipcMain.on('config:save', function(e, [serverkey, gateway]) {
        mainWindow.webContents.send('config:save', [serverkey, gateway]);

        fs.writeFileSync(path.join(__dirname, 'serverkey.txt'), serverkey);
        fs.writeFileSync(path.join(__dirname, 'gateway.txt'), gateway);
    });


    // Main Window menu
    const mainMenu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Close',
                    accelerator: 'Ctrl+C',
                    click(){
                        mainWindow.hide();
                    }
                },
                {
                    label: 'Quit',
                    accelerator: 'Ctrl+Q',
                    click(){
                        app.quit();
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(mainMenu);


    // Tray menu
    trayIcon = new Tray(iconPath);
    const trayMenu = Menu.buildFromTemplate([
        {
            label: 'nMon Agent',
            icon: iconPath,
            click: function() {
                mainWindow.show();
            }
        },
        {
            label: 'Quit',
            accelerator: 'Ctrl+Q',
            click(){
                app.quit();
            }
        }
    ]);
    trayIcon.setToolTip('nMon Agent');
    trayIcon.setContextMenu(trayMenu);

    trayIcon.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })


    // Do the job

    function intervalFunc() {

        async function firstNetworkPass() {
            const ifaces = await si.networkInterfaces();

            for (let iface of ifaces) {
                const contents = await si.networkStats(iface.iface);
            }

        }


        async function collectAndReport() {
            var post_data = "";

            const allData = await si.getAllData();
            const processes = await si.processes();
            const networkInterfaceDefault = await si.networkInterfaceDefault();
            const ifaces = await si.networkInterfaces();

            var networkStats = [];

            for (let iface of ifaces) {
                const contents = await si.networkStats(iface.iface);
                networkStats.push(contents);
            }


            // agent_version #OK
            agent_version = "1.0";
            post_data = post_data + "{agent_version}" + agent_version + "{/agent_version}";

            // serverkey
            serverkey_file = fs.readFileSync(path.join(__dirname, 'serverkey.txt'));
            serverkey = serverkey_file.toString();
            post_data = post_data + "{serverkey}" + serverkey + "{/serverkey}";

            // gateway
            gateway_file = fs.readFileSync(path.join(__dirname, 'gateway.txt'));
            gateway = gateway_file.toString();
            post_data = post_data + "{gateway}" + gateway + "{/gateway}";

            // time #TBD
            time = new Date();
            post_data = post_data + "{time}" + time + "{/time}";

            // uptime #OK
            uptime = si.time().uptime;
            post_data = post_data + "{uptime}" + uptime + "{/uptime}";

            // hostname #OK
            hostname = allData.os.hostname;
            post_data = post_data + "{hostname}" + hostname + "{/hostname}";

            // kernel #OK
            kernel = allData.os.kernel;
            post_data = post_data + "{kernel}" + kernel + "{/kernel}";

            // os #OK
            os_name = allData.os.distro;
            post_data = post_data + "{os}" + os_name + "{/os}";

            // os_arch #OK
            os_arch = allData.os.arch;
            post_data = post_data + "{os_arch}" + os_arch + "{/os_arch}";

            // cpu_model #OK
            cpu_model = allData.cpu.manufacturer + " " + allData.cpu.brand + " " + allData.cpu.speed + "GHz";
            post_data = post_data + "{cpu_model}" + cpu_model + "{/cpu_model}";

            // cpu_cores #OK
            cpu_cores = allData.cpu.cores;
            post_data = post_data + "{cpu_cores}" + cpu_cores + "{/cpu_cores}";

            // cpu_speed #OK
            cpu_speed = allData.cpu.speed;
            post_data = post_data + "{cpu_speed}" + cpu_speed + "{/cpu_speed}";

            // ram_total #OK
            ram_total = allData.mem.total;
            post_data = post_data + "{ram_total}" + ram_total + "{/ram_total}";

            // ram_free #OK
            ram_free = allData.mem.free;
            post_data = post_data + "{ram_free}" + ram_free + "{/ram_free}";

            // ram_caches #NOT_IN_WIN
            ram_caches = allData.mem.buffcache;
            post_data = post_data + "{ram_caches}" + ram_caches + "{/ram_caches}";

            // ram_buffers #NOT_IN_WIN
            ram_buffers = allData.mem.buffcache;
            post_data = post_data + "{ram_buffers}" + ram_buffers + "{/ram_buffers}";

            // ram_usage #OK
            ram_usage = allData.mem.used;
            post_data = post_data + "{ram_usage}" + ram_usage + "{/ram_usage}";

            // swap_total #OK
            swap_total = allData.mem.swaptotal;
            post_data = post_data + "{swap_total}" + swap_total + "{/swap_total}";

            // swap_free #OK
            swap_free = allData.mem.swapfree;
            post_data = post_data + "{swap_free}" + swap_free + "{/swap_free}";

            // swap_usage #OK
            swap_usage = allData.mem.swapused;
            post_data = post_data + "{swap_usage}" + swap_usage + "{/swap_usage}";

            // cpu_load
            cpu_load = JSON.stringify(allData.currentLoad);
            post_data = post_data + "{cpu_load}" + cpu_load + "{/cpu_load}";

            // net_interfaces
            net_interfaces = JSON.stringify(allData.net);
            post_data = post_data + "{net_interfaces}" + net_interfaces + "{/net_interfaces}";

            // net_stats
            net_stats = JSON.stringify(networkStats);
            post_data = post_data + "{net_stats}" + net_stats + "{/net_stats}";

            // default_interface
            default_interface = networkInterfaceDefault;
            post_data = post_data + "{default_interface}" + default_interface + "{/default_interface}";

            // processes
            processes_post = JSON.stringify(processes);
            post_data = post_data + "{processes}" + processes_post + "{/processes}";

            // ping_latency
            ping_latency = allData.inetLatency;
            post_data = post_data + "{ping_latency}" + ping_latency + "{/ping_latency}";

            // disks
            disk_layout = JSON.stringify(allData.diskLayout);
            post_data = post_data + "{disk_layout}" + disk_layout + "{/disk_layout}";

            // filesystems
            filesystems = JSON.stringify(allData.fsSize);
            post_data = post_data + "{filesystems}" + filesystems + "{/filesystems}";

            // network_connections
            network_connections = JSON.stringify(allData.networkConnections);
            post_data = post_data + "{network_connections}" + network_connections + "{/network_connections}";

            // system
            system = JSON.stringify(allData.system);
            post_data = post_data + "{system}" + system + "{/system}";

            // bios
            bios = JSON.stringify(allData.bios);
            post_data = post_data + "{bios}" + bios + "{/bios}";

            // baseboard
            baseboard = JSON.stringify(allData.baseboard);
            post_data = post_data + "{baseboard}" + baseboard + "{/baseboard}";


            if(gateway != "") {
                request.post(gateway).form({data: post_data})
            }

            //console.log(allData);
            //console.log(networkStats);
            //console.log(processes);
            //console.log(post_data);
        }

        // get networking data
        firstNetworkPass();

        // wait 1 second and run the main reporting function
        setTimeout(collectAndReport, 1000);



    }

    // run every 60 seconds
    setInterval(intervalFunc, 60000);
});




app.on("before-quit", ev => {
    // BrowserWindow "close" event spawn after quit operation,
    // it requires to clean up listeners for "close" event
    mainWindow.removeAllListeners("close");

    // release mainWindow
    mainWindow = null;
});

process.on('uncaughtException', function (err) {
    console.log(err);
});

// Single Instance Check - prevent multiple running agents
var iShouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
    return true;
});
if(iShouldQuit){app.quit();return;}
