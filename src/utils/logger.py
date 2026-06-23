import logging
import os

class ColorFormatter(logging.Formatter):
    COLORS = {
        logging.DEBUG: "\033[94m",
        logging.INFO: "\033[92m",
        logging.WARNING: "\033[93m",
        logging.ERROR: "\033[91m",
        logging.CRITICAL: "\033[1;91m"
    }
    RESET = "\033[0m"

    def __init__(self, fmt):
        super().__init__()
        self.fmt = fmt

    def format(self, record):
        color = self.COLORS.get(record.levelno, self.RESET)
        log_fmt = f"{color}{self.fmt}{self.RESET}"
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)


def get_logger(name: str):
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        fmt_str = '%(asctime)s - [%(name)s] - %(levelname)s - %(message)s'

        file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
        file_handler.setFormatter(logging.Formatter(fmt_str))

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(ColorFormatter(fmt_str))

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger