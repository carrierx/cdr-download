#!/usr/bin/env python3

import argparse
import csv
import datetime
import httpx
import json
import sys
from pathlib import Path


BASE_URL = 'https://api.carrierx.com/core/v2'
CDR_URL_CALLS = f'{BASE_URL}/calls/call_drs'
CDR_URL_CONFERENCE = f'{BASE_URL}/app/conference/calls'
PAGE_SIZE = 1000  # Maximum 1,000

parser = argparse.ArgumentParser(
    description="Download CarrierX call detail records"
)
parser.add_argument(
    '-t', '--token', nargs='?', required=True,
    help='Security access token available in the portal',
)
parser.add_argument(
    '-b', '--begin', nargs='?', required=True,
    help=(
        'The begining date (and optionally time), inclusive, '
        'in ISO 8601 format'
    ),
)
parser.add_argument(
    '-e', '--end', nargs='?',
    help=(
        'The ending date (and optionally time), exclusive, in ISO 8601 '
        'format. Default is now.'
    )
)
parser.add_argument(
    '-f', '--format', choices=['json', 'csv'], nargs='?',
    default='csv',
    help='"json" or "csv"',
)
parser.add_argument(
    '-o', '--overwrite', action='store_true',
    help='Overwrite the output file. Default False',
)
parser.add_argument(
    '-c', '--conference', action='store_true',
    help='Get conference call records. Default is SIP call records',
)
parser.add_argument(
    'filename',
    help="File where the CDRs should be written",
)


class CdrGetter:
    def __init__(self, args):
        self._token = args.token
        if not self.is_valid_date(args.begin):
            raise Exception(f'Invalid beginning date: {args.begin}')
        self._begin = args.begin
        if not args.end or not self.is_valid_date(args.end):
            self._end = datetime.datetime.now(
                datetime.UTC).replace(microsecond=0).isoformat()
        else:
            self._end = args.end

        if not self.is_valid_dir(args.filename):
            raise Exception(
                f'Directory does not exist: {
                    Path(args.filename).parent
                }'
            )
        if self.does_file_exist(args.filename) and not args.overwrite:
            raise Exception(
                'Output file exists. Use --overwrite.'
            )
        self._filename = args.filename
        self._is_csv = args.format == 'csv'
        if args.conference:
            self._url = CDR_URL_CONFERENCE
        else:
            self._url = CDR_URL_CALLS
        self._next_url: str = None

    def is_valid_date(self, date_str: str) -> bool:
        try:
            datetime.datetime.fromisoformat(date_str)
            return True
        except ValueError:
            return False

    def is_valid_dir(self, filename):
        try:
            return Path(filename).parent.is_dir()
        except Exception:
            return False

    def does_file_exist(self, filename):
        try:
            return Path(filename).exists()
        except Exception:
            return False

    def _open_output(self):
        self._output_file = open(self._filename, 'w', newline='')
        if self._is_csv:
            self._csv_writer = csv.writer(
                self._output_file,
                delimiter=',',
                quotechar='"',
                quoting=csv.QUOTE_ALL
            )

    def _close_output(self):
        self._output_file.close()

    def _get_cdrs(self, limit: int = None):
        params = None
        url = self._next_url
        if self._next_url is None:
            params = {
                'filter': (
                    f'date_stop ge {self._begin} and '
                    f'date_stop lt {self._end}'
                ),
                'limit': limit,
                'order': 'date_stop asc',
            }
            url = self._url
        r = httpx.get(
            url,
            params=params,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self._token}',
            }
        )
        self._next_url = r.json().get('pagination', {}).get('next', None)
        return r.json()

    def _write_csv(self, records):
        for row in records:
            self._csv_writer.writerow(row.values())

    def _write_json(self, records):
        self._output_file.write(json.dumps(records))

    def get(self):
        self._open_output()
        json_cdrs = list()
        page = 0
        while True:
            print(f'Page: {page}')
            cdrs = self._get_cdrs(PAGE_SIZE)

            if cdrs['count'] == 0:
                break
            if self._is_csv:
                if page == 0:
                    self._csv_writer.writerow(cdrs['items'][0].keys())
                self._write_csv(cdrs['items'])
            else:
                json_cdrs += cdrs['items']
            if cdrs['count'] < PAGE_SIZE:
                break
            page += 1
        if not self._is_csv:
            self._write_json(json_cdrs)
        self._close_output()


def main():
    try:
        getter = CdrGetter(parser.parse_args())
        getter.get()
    except Exception as e:
        print(e)
        sys.exit(1)


if __name__ == '__main__':
    main()
