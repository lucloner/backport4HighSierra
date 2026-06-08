#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <dlfcn.h>

/* Provide ____chkstk_darwin */
__attribute__((visibility("default")))
void ____chkstk_darwin(void) {
}

__attribute__((visibility("default")))
void _chkstk(void) {
}

int main(int argc, char *argv[]) {
    /* Set DOTNET_ROOT */
    setenv("DOTNET_ROOT", "/Volumes/Data/src/runtime-8.0/.dotnet", 0);
    
    /* Get the real dotnet path */
    const char *dotnet_path = "/Volumes/Data/src/runtime-8.0/.dotnet/dotnet.bin";
    
    /* Build argument list */
    char **new_argv = malloc((argc + 1) * sizeof(char *));
    new_argv[0] = (char *)dotnet_path;
    for (int i = 1; i < argc; i++) {
        new_argv[i] = argv[i];
    }
    new_argv[argc] = NULL;
    
    /* Execute the real dotnet */
    execv(dotnet_path, new_argv);
    
    perror("execv failed");
    free(new_argv);
    return 1;
}
