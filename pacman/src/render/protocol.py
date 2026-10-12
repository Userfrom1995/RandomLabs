"""RenderBackend interface: string-in/string-out, never touches stdout.

Every backend implements init/present/clear/shutdown as pure functions
returning the exact bytes to write. Tests capture those strings, so terminal
behavior is verified headlessly. available() reports whether the backend can
run in this process (image backends need Pillow for the atlas).
"""

from abc import ABC, abstractmethod


class RenderBackend(ABC):
    name = "base"

    @abstractmethod
    def available(self):
        """True when this backend can run in the current process."""

    @abstractmethod
    def init(self, cols, rows):
        """Setup sequence (alt screen, cursor, sync). Returns str."""

    @abstractmethod
    def present(self, fb, dirty):
        """Render dirty cells of framebuffer fb. Returns str."""

    @abstractmethod
    def clear(self):
        """Full clear. Returns str."""

    @abstractmethod
    def shutdown(self):
        """Teardown sequence (restore screen/cursor). Returns str."""
