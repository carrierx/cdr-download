# Carrier CDR Download

Download CarrierX Call Data Records via the api. There are two versions of the application: Javascript and Python.

## Javascript

The application requires NodeJS to run.

### Installation

In the terminal, change directory to the project root and run:

```shell
cd nodejs
npm install
```

### Running

In the `nodejs` directory, run the following

```shell
node cxGetCdrs.js <options> outputFileName.csv
```

See [Options](#options) below for options.

## Python

It is recommended that you create a virtual environment as the app requires additional modules.

### Installation

Open a terminal in the project root and run:

```shell
cd python
pip3 install -r requirements.txt
```

### Running

In the `python` directory, run:

```shell
python3 cx_get_cdrs.py <options> output_file_name.csv
```

## Options

The following command line options are common across both the Python and Javascript versions.

### File name

You most specify an output file name where records will be written. The app will create the output file but it will **not** create any directories.

### Options

| Short | Long | Required | Description |
| ----- | ---- | -------- | ----------- |
| -t | --token | Required | Security access token available via the API or in the portal. [Documentation](https://www.carrierx.com/documentation/quick-start/token?show_admin=true#introduction) |
| -b *&lt;date&gt;* | --begin *&lt;date&gt;* | Required | The begining date (and optionally time), inclusive, in ISO 8601 format - YYYY-MM-DD[THH:MM:SS]. Dates and times are UTC. |
| -e *&lt;date&gt;* | --end *&lt;date&gt;* | Optional | The end date (and optionally time), exclusive, in ISO 8601 format - YYYY-MM-DD[THH:MM:SS]. Dates and times are UTC. **Default - now**. |
| -f  *&lt;format&gt;*| --format *&lt;format&gt;* | Optional | The output format, `csv` or `json`. **Default - `csv`** |
| -o | --overwrite | Optional | Overwrite the output file. By default the app will not overwrite the output file. |
| -c | --conference | Optional | Get conference call records. By default the app will fetch SIP call records |
| -h | --help | Optional | Display command help |

## Examples

All examples can use the same options, regardless of runtime (NodeJS / Python).

Use caution entering an access token on the command line as commands, and therefore tokens, can be saved.  All examples below use a environment variable `$CX_TOKEN` where the token is stored.

### Since some date - minium options

```shell
python3 cx_get_cdrs.py --token $CX_TOKEN --begin 2024-10-31 path_to/cdrs.csv
```

### Date range

```shell
node cxGetCdrs.js --token $CX_TOKEN --begin 2024-10-31 --end 2024-11-06 path_to/cdrs.csv
```

### Time range - 1 hour

```shell
python3 cx_get_cdrs.py --token $CX_TOKEN --begin 2024-10-31T18:00:00 --end 2024-10-31T19:00:00 path_to/cdrs.csv
```

### As JSON

```shell
node cxGetCdrs.js --token $CX_TOKEN --begin 2024-10-31 --format json path_to/cdrs.json
```

### Overwrite output

By default, the app will not overwrite an existing file. If you want to overwrite the file, you need to specify `-o` or `--overwrite`.

```shell
node cxGetCdrs.js --token $CX_TOKEN --begin 2024-10-31 --overwrite path_to/cdrs.csv
```

### Conference records

If you want conference records instead of SIP call records, specify `-c` or `--conference`.

```shell
python3 cx_get_cdrs.py --token $CX_TOKEN --begin 2024-10-31 --conference path_to/cdrs.csv
```
