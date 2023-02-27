# ProcessWire 3.x

This is an edited copy of ProcessWire by [EPRC](https://eprc.studio), made for internal use.

To have a look at the original README, please go to the [ProcessWire](https://github.com/processwire/processwire) repository.

## How to use

Assuming you are part of the team:

```bash
cd /path/to/client
```

```bash
git clone --recurse-submodules https://github.com/eprcstudio/processwire ./public
```

```bash
cd ./public
```

```bash
rm -rf .git .gitattributes .gitignore .gitmodules \
    ./site-eprc/.git ./site-eprc/.gitmodules \
    ./site-eprc/modules/ProcessDatabaseBackups/.git \
    ./site-eprc/modules/ProcessEPRC/.git \
    ./site-eprc/modules/ProcessWireUpgrade/.git
```