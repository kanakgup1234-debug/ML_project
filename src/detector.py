import os
import time
import glob
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import processor
import card_generator
import emailer

class QuizFolderHandler(FileSystemEventHandler):
    def __init__(self, callback):
        super().__init__()
        self.callback = callback

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.csv'):
            print(f"\n[Watcher] New quiz file detected: {event.src_path}")
            # Give the file a brief moment to finish writing
            time.sleep(1)
            self.callback()

def start_polling_fallback(directory, callback, interval=5):
    """Fallback polling detector using standard libraries if watchdog has issues."""
    print(f"[Watcher] Starting polling watcher on '{directory}' (checking every {interval}s)...")
    existing_files = set(glob.glob(os.path.join(directory, "*.csv")))
    
    try:
        while True:
            time.sleep(interval)
            current_files = set(glob.glob(os.path.join(directory, "*.csv")))
            new_files = current_files - existing_files
            
            if new_files:
                print(f"\n[Watcher] Detected {len(new_files)} new quiz file(s): {', '.join(new_files)}")
                existing_files = current_files
                callback()
    except KeyboardInterrupt:
        print("\n[Watcher] Stopping polling watcher.")

def start_watching(directory, callback):
    """Starts watching the specified folder using watchdog, falls back to polling if fails."""
    os.makedirs(directory, exist_ok=True)
    
    try:
        event_handler = QuizFolderHandler(callback)
        observer = Observer()
        observer.schedule(event_handler, directory, recursive=False)
        observer.start()
        print(f"[Watcher] Watchdog observer started on '{directory}'.")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[Watcher] Stopping watchdog observer...")
            observer.stop()
        observer.join()
        
    except Exception as e:
        print(f"[Watcher] Watchdog error: {e}. Falling back to polling mode.")
        start_polling_fallback(directory, callback)
