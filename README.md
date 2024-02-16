# ProcessWire 3.x

This is an edited copy of ProcessWire by [EPRC](https://eprc.studio), made for internal use.

To have a look at the original README, please go to the [ProcessWire](https://github.com/processwire/processwire) repository.

## How to use

Assuming you are part of the team, follow the instructions described [here](https://github.com/eprcstudio/processwire-starter)

## How to update `/wire`

(for the maintainer only)

Solution from https://stackoverflow.com/a/25749155, assuming you have added a remote named `upstream`.

```
git fetch upstream
git checkout upstream/dev wire/
git commit -am "Update /wire to latest dev version"
git pull --rebase
git push
```