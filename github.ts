export function getAllOrgRepos(gh, orgName) {
  var repos = [];

  function pager(res) {
    repos = repos.concat(res);
    if (gh.hasNextPage(res)) {
      return gh.getNextPage(res)
        .then(pager);
    }
    return repos;
  }

  return gh.repos.getForOrg({ org: orgName })
    .then(pager);
}


export const getFile = async (gh, repo: any, path: string): Promise<string | null> => {
  try {
    const content = await gh.repos.getContent({
      owner: repo.owner.login,
      repo: repo.name,
      path
    })

    const buffer = new Buffer(content.data.content, "base64")
    return buffer.toString()

  } catch (error) {
    return null
  }
}

export const leaveIssue = async (gh, repo, title, body) => {
  await gh.issues.create({
    owner: repo.owner.login,
    repo: repo.name,
    title,
    body,
  })
}

export const isUserInOrg = async (gh, org, username) => {
  // A failing networking request represents not found
  try {
    const r = await gh.orgs.checkMembership({ org, username })
    return true
  } catch (error) {
    return false
  }
}
