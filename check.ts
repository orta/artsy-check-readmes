import * as fetch from "node-fetch"
import * as github from "github"
import * as fs from "fs"
import * as _ from "underscore"

import {getAllOrgRepos, getFile, leaveIssue, isUserInOrg} from "./github"

const org = "artsy"
const repoCache = "cache/repos.json"

const gh = new github({ headers: { "user-agent": "Org README checker" } })
gh.authenticate({ type: "token", token: process.env.GITHUB_TOKEN, })

const log = (repo, message) => {
  console.log(`[${repo.name}] - ${message}`)
}

const go = async () => {
  let repoSets = []
  if (fs.existsSync(repoCache)) {
    repoSets = JSON.parse(fs.readFileSync(repoCache).toString())
  } else {
    repoSets = await getAllOrgRepos(gh, org)
    fs.writeFileSync(repoCache, JSON.stringify(repoSets))
  }

  const repos = _.flatten(repoSets.map(r => r["data"]))

  const eigen = _.find(repos, r => r.name === "eigen")
  const gravity = _.find(repos, r => r.name === "gravity")
  const sand = _.find(repos, r => r.name === "sandback-api")
  
  const artsyD = _.find(repos, r => r.name === "artsy-danger")
  // await doWork(eigen)
  // await doWork(gravity)
  await doWork(artsyD)

  // for (const repo of repos) {
  //   await doWork(repo)
  // }
}


const doWork = async (repo) => {
  const readme = await getFile(gh, repo, "README.md")
  if (!readme) {
    log(repo, "Could not find a README")
    return
  }

  const pp = /__Point People:__ (.*)/g
  const pointMatches = readme.match(pp)

  // http://stackoverflow.com/questions/1500260/detect-urls-in-text-with-javascript
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  if (!pointMatches || pointMatches.length === 0) {
    const contributors = await gh.repos.getContributors({ owner: org, repo: repo.name})
    log(repo, `No point person found, perhaps @${contributors.data[0].login}.`)
  } else {
    const ownerString = pointMatches[0] as string
    const urls = ownerString.match(urlRegex) || []
    const githubOwners = urls.filter(u => u.includes("github")).map(f => f.split("/").pop())
    const slackUrls = urls.filter(u => u.includes("slack")).map(f => f.split("/").pop())

    if (githubOwners.length === 0 && slackUrls.length === 0) {
      log(repo, "Has no owners")
    } else {

      const usersNotInOrg = []
      for (const owner of githubOwners) {
        const inOrg = await isUserInOrg(gh, org, owner)
        if (!inOrg) {
          usersNotInOrg.push(owner)
        }
      }
      if (usersNotInOrg.length) {
        log(repo, "Found someone not in the org: " + usersNotInOrg)
      }
    }
  }
}

go()

process.on("unhandledRejection", (reason: string, p: any) => {
  console.log("Error: ", reason)  // tslint:disable-line
})
