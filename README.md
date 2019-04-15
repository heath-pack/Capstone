RUNNING A DEVELOPMENTAL SERVER:
    To do so, first cd into the directory of this folder(Capstone). 
    Next run the command  "npm run electron-dev"
    This will start a development erver to run the app and also will run the app in your browser on localhost:3000.
    To stop the server,  type control + c in the terminal.

TO BUILD THIS APPLICATION FOR DISTRIBUTION:
    First cd into the directory of this folder(Capstone).
    Next, run the commmand "npm run electron-pack".
    This will create a build folder and a dist folder.
    The dist folder is all that you will need, you can then copy and rename this folder as you please.
    I recommend zipping this folder distribution, then all that needs to be done is to run the "Local-Lock Setup 1.0.0.exe" 
        and the application will be installed where the user chooses.