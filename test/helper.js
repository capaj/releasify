'use strict'

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const proxyquire = require('proxyquire')

const factorySimpleGit = require('./proxy/simple-git-proxy')
const factoryOctokit = require('./proxy/octokit-proxy')
const factoryNpm = require('./proxy/npm-proxy')

function wait (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

function readFileHelp (file) {
  const help = fs.readFileSync(path.join('./man', file), 'utf8')
  return `${help}\n` // added because shell add a new line at the end
}

function execute (command, params = []) {
  const node = process.execPath
  return childProcess.spawn(node, ['lib/cli', command, ...params])
}

function buildProxyCommand (commandPath, opts = {}) {
  childProcess.spawn = factoryNpm(opts.npm).spawn

  const ptnpm = proxyquire('../lib/publishToNpmWithOTPInquiry', {
    './npm': proxyquire('../lib/npm', {
      child_process: factoryNpm(opts.npm) // for some reason this does not work as expected-child process is still unmocked-that's why the line 25 is needed
    })
  })
  console.log('~ ptnpm', commandPath)
  return proxyquire(commandPath, {
    '../git-directory': proxyquire('../lib/git-directory', {
      'simple-git': factorySimpleGit(opts.git)
    }),
    '../github': proxyquire('../lib/github', {
      '@octokit/rest': factoryOctokit(opts.github)
    }),
    '../publishToNpmWithOTPInquiry': ptnpm,
    ...opts.external
  })
}

module.exports = {
  wait,
  readFileHelp,
  execute,
  buildProxyCommand
}
