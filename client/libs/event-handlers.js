/* eslint-disable quotes */
/* eslint-disable comma-dangle */
'use strict';

require('dotenv').config();
const inquirer = require('inquirer');
const io = require('socket.io-client');
const ui = new inquirer.ui.BottomBar();
const chalk = require('chalk');
const emoji = require('node-emoji');
const figlet = require('figlet');
const pink = chalk.rgb(250, 142, 214);

const serverChannel = io.connect(
  'https://command-love-interface.herokuapp.com'
);

// const serverChannel = io.connect('http://localhost:3001');

let trueOrFalse = true;

figlet.text(
  'Command Love Interface',
  {
    font: 'Big',
    verticalLayout: 'fitted',
    width: 60,
    whitespaceBreak: true,
  },
  function (err, data) {
    if (err) {
      console.log('Something went wrong');
      console.dir(err);
      return;
    }
    console.log(data);
  }
);

async function loginOrCreate() {
  let input = await inquirer.prompt([
    {
      type: 'list',
      name: 'loginChoice',
      message: pink.bold('Please log in or sign up!'),
      choices: ['Log In', 'Sign Up'],
    },
  ]);

  if (input.loginChoice === 'Log In') {
    login();
  } else createUser();
}

async function login() {
  let input = await inquirer.prompt([
    { name: 'username', message: 'Please enter your username:' },
  ]);

  let pass = await inquirer.prompt([
    {
      type: 'password',
      mask: ['default'],
      name: 'password',
      message: 'Please enter your password:',
    },
  ]);

  const signupObject = {
    username: input.username,
    password: pass.password,
  };

  serverChannel.emit('signin', signupObject);
}

async function createUser() {
  let newUsername = await inquirer.prompt([
    { name: 'username', message: 'Choose a username:' },
  ]);

  let newPass = await inquirer.prompt([
    {
      type: 'password',
      mask: ['default'],
      name: 'password',
      message: 'Please choose a password:',
    },
  ]);

  ui.log.write('This password will be hacked immediately. Try again.');

  newPass = await inquirer.prompt([
    {
      type: 'password',
      mask: ['default'],
      name: 'password',
      message: 'Please choose a password:',
    },
  ]);

  let newEmail = await inquirer.prompt([
    { name: 'email', message: 'Enter your email:' },
  ]);

  let newFav = await inquirer.prompt([
    {
      name: 'favLanguage',
      message: 'What is your favorite development language?',
    },
  ]);

  let newDesc = await inquirer.prompt([
    {
      name: 'description',
      message: 'Tell us about yourself in one sentence:',
    },
  ]);

  let newOs = await inquirer.prompt([
    { name: 'os', message: 'What operating system do you use?' },
  ]);

  const newUser = {
    username: newUsername.username,
    password: newPass.password,
    email: newEmail.email,
    favLanguage: newFav.favLanguage,
    description: newDesc.description,
    os: newOs.os,
  };

  serverChannel.emit('signup', newUser);

  ui.log.write(
    pink.bold(
      `Welcome to the Command-Love-Interface, ${newUser.username}! Please log in to get started.`
    )
  );
  login();
}

async function validateMe(username) {
  if (username) {
    serverChannel.username = username;
    serverChannel.emit('connected', username);
  } else {
    ui.log.write(chalk.red('Invalid login. Please try again.'));
    loginOrCreate();
  }
}

async function getInput(username) {
  let input;
  // eslint-disable-next-line no-constant-condition
  while (trueOrFalse) {
    input = null;
    input = await inquirer.prompt([{ name: 'text', message: ' ' }]);

    if (input.text === '--exit') {
      trueOrFalse = false;
      return menu(username);
    } else if (input.text.slice(0, 3) === '---') {
      trueOrFalse = false;
      return sendPrivateMessageHandler(input);
    }

    let messageObj = {
      message: input.text,
      sender: username,
      room: 'lobby',
    };

    if (input.text) {
      await serverChannel.emit('message', messageObj);
    }
  }
}

async function sendPrivateMessageHandler(input) {
  let targetUser = input.text.match(/[a-zA-Z0-9]+\b/g)[0];
  let privateMessage = input.text.substr(4 + targetUser.length);

  let privateMessageObj = {
    targetUser,
    privateMessage,
  };

  serverChannel.emit('private-message-sent', privateMessageObj);
  trueOrFalse = true;
  getInput(serverChannel.username);
}

////////////////////// MENU OPTION FUNCTIONS //////////////////////

async function discover(onlineUsers) {
  ui.log.write('You chose: DISCOVER');
  if (onlineUsers.length) {
    ui.log.write(pink(`USERS ONLINE: ${onlineUsers.length}`));
    onlineUsers.forEach((user) => {
      ui.log.write(pink('===================='));
      ui.log.write(pink.bold('> Username: ', user.username));
      ui.log.write(
        chalk.bold('> Favorite Programming Language: ', user.favLanguage)
      );
      ui.log.write(pink.bold('> Operating System: ', user.os));
      ui.log.write(chalk.bold('> About Me: ', user.description));
    });
  } else {
    ui.log.write(pink('No users currently online.'));
  }

  let input = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Options: ',
      choices: ['Back to Main Menu'],
    },
  ]);

  if (input.choice === 'Back to Main Menu') {
    return menu(serverChannel.username);
  }
}

async function newChat(username) {
  ui.log.write(pink("Enter: '--exit' to return to the main menu"));
  ui.log.write(
    pink(
      "Enter: '---<username>' to send a private message to the specified user"
    )
  );
  trueOrFalse = true;
  getInput(username);
}

async function resumeChat(payload) {
  payload.messages.forEach((message) => {
    ui.log.write(`[${message.sender}]: ${message.message}`);
  });
  trueOrFalse = true;
  ui.log.write(pink("Enter: '--exit' to return to the main menu"));
  ui.log.write(
    pink(
      "Enter: '---<username>' to send a private message to the specified user"
    )
  );
  getInput(payload.username); // needs to happen here
}

async function profile(userProfile) {
  ui.log.write('You chose: PROFILE');
  console.log(pink('USER PROFILE:'), userProfile);

  let input = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Options: ',
      choices: ['Back to Main Menu', 'Logout'],
    },
  ]);
  if (input.choice === 'Back to Main Menu') {
    return menu(userProfile.username);
  } else if (input.choice === 'Logout') {
    return logout(userProfile.username);
  } else profile(userProfile);
}

// User needs to manually exit
async function logout(username) {
  ui.log.write(
    chalk.red('If you must log out, press "CTRL/CMD + C" on your keyboard.')
  );
  setTimeout(() => {
    ui.log.write(chalk.red("\n \n Please don't go."));
  }, 1000);
  setTimeout(() => {
    ui.log.write(chalk.red('\n \n Seriously, I am begging you.'));
  }, 2500);
  setTimeout(() => {
    ui.log.write(chalk.red('\n \n My steely heart is breaking in half.'));
  }, 4000);
  setTimeout(() => {
    ui.log.write(
      chalk.red(
        '\n \n If you log out, I will be forced to detonate your computer,\n spraying shards of synthetic shrapnel in all directions.'
      )
    );
  }, 6000);
  setTimeout(() => {
    ui.log.write(
      chalk.red(
        '\n \n May a curse of financial destitution be brought down upon your progeny.'
      )
    );
    // process.exit(0); // Will give a clean exit after timeout
  }, 9000);
}

// MAIN MENU FUNCTION
async function menu(username) {
  let input = await inquirer.prompt([
    {
      type: 'list',
      name: 'menuChoice',
      message:
        '\n' +
        chalk.bgMagenta('Beauty is in the Back End \n') +
        pink.bold(
          '\nWelcome to the Command-L' +
            emoji.get('heart') +
            ' ve-Interface! \n \n'
        ) +
        pink.bold('What would you like to do? \n \n') +
        pink.italic(
          '- Discover ' +
            emoji.get('eyes') +
            "  : See other coders' profiles \n"
        ) +
        pink.italic(
          '- Chat ' +
            emoji.get('speech_balloon') +
            '  : with hot bots like you \n'
        ) +
        pink.italic(
          '- Profile ' + emoji.get('fire') + '  : update your profile \n'
        ) +
        pink.italic('- Logout ' + emoji.get('x') + "  : don't go... \n \n"),
      choices: ['Discover', 'New Chat', 'Resume Chat', 'Profile', 'Logout'],
    },
  ]);

  if (input.menuChoice === 'Discover') {
    serverChannel.emit('discover');
  } else if (input.menuChoice === 'New Chat') {
    return newChat(username);
  } else if (input.menuChoice === 'Resume Chat') {
    serverChannel.emit('resumeChat', username);
  } else if (input.menuChoice === 'Profile') {
    serverChannel.emit('profile', serverChannel.username);
  } else if (input.menuChoice === 'Logout') {
    return logout(username);
  } else {
    ui.log.write(
      chalk.red(
        'Oops! That didn\t work. Please try again using the methods provided.'
      )
    );
  }
}

module.exports = {
  login,
  createUser,
  loginOrCreate,
  validateMe,
  getInput,
  menu,
  discover,
  newChat,
  profile,
  logout,
  resumeChat,
  serverChannel,
  ui,
};
