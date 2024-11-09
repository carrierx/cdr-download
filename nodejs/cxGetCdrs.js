#!/usr/bin/env nodejs

const {program, Option} = require('commander');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const jsonfile = require('jsonfile');
const path = require('path');


const BASE_URL = 'https://api.carrierx.com/core/v2';
const CDR_URL_CALLS = `${BASE_URL}/calls/call_drs`;
const CDR_URL_CONFERENCE = `${BASE_URL}/app/conference/calls`;
const PAGE_SIZE = 1_000;  // Maximum 1,000


class CdrGetter {
  #begin;
  #csvWriter;
  #end;
  #filename;
  #format;
  #jsonData;
  #nextUrl;
  #overwrite;
  #token;
  #url;

  constructor(filename, options) {
    this.#jsonData = new Array();
    this.#token = options.token;
    try {
      this.#begin = this.#getDateString(options.begin);
    } catch (error) {
      throw new Error('Invalid start date');
    }
    try {
      this.#end = this.#getDateString(options.end);
    } catch (error) {
      this.#end = this.#getDateString(new Date().toISOString());
    }
    this.#format = options.format;
    this.#nextUrl = null;
    this.#overwrite = options.overwrite;
    this.#url = options.conference ?
      CDR_URL_CONFERENCE :
      CDR_URL_CALLS;
    this.#filename = filename;
    if (!this.#dirExists(this.#filename)) {
      throw new Error(`Directory "${path.dirname(this.#filename)}" does not exist.`);
    }
    if (fs.existsSync(this.#filename) && !this.#overwrite) {
      throw new Error(`Output file exists. Use --overwrite to overwrite output file.`);
    }
  }

  #dirExists = (filename) => {
    try {
      return fs.existsSync(path.dirname(filename));
    } catch (error) {
      return false;
    }
  }

  #getDateString = (date) => {
      return this.#getCleanDate(date).toISOString().split('.')[0] + 'Z';
  }

  #getCleanDate = (date) => {
    return this.#hasTimeZone(date) ? new Date(date) : new Date(`${date}Z`);
  }

  #hasTimeZone = (date) => {
    return Boolean(date.match(/[+-][\d][\d]:[\d][\d]$/) || date.match(/Z$/));
  }

  #fetchCdrs = async (limit) => {
    const url = this.#nextUrl || this.#url + '?' + new URLSearchParams({
      filter: `date_stop ge ${
        this.#begin} and date_stop lt ${this.#end}`,
      limit,
      order: 'date_stop asc',
    }).toString();
    const r = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.#token}`,
        }
      }
    );
    const data = await r.json()
    this.#nextUrl = data?.pagination?.next;
    return data;
  }

  #initCsv = async (cdr) => {
    const header = new Array();
    for (const key in cdr) {
      header.push({
        id: key,
        title: key,
      });
    }
    this.#csvWriter = createCsvWriter({
      path: this.#filename,
      header,
    });
  }

  #writeCsv = async (cdrs) => {
    if (!this.#csvWriter) {
      this.#initCsv(cdrs.items[0]);
    }
    await this.#csvWriter.writeRecords(cdrs.items);
  }

  get = async () => {
    let page = 0;
    while (true) {
      console.log(`Page: ${page}`);
      const cdrs = await this.#fetchCdrs(PAGE_SIZE);
      if (cdrs.count === 0) break;
      if (this.#format === 'csv') {
        await this.#writeCsv(cdrs);
      } else {
        this.#jsonData = this.#jsonData.concat(cdrs.items);
      }
      if (cdrs.count < PAGE_SIZE) break;
      page++;
    }
    if (this.#format === 'json') {
      await jsonfile.writeFile(
        this.#filename,
        this.#jsonData,
        {spaces: 2}
      );
    }
  }
}


program
  .description('Download CarrierX call detail records')
  .requiredOption(
    '-t, --token <access_token>',
    'Security access token available in the portal.'
  )
  .requiredOption(
    '-b, --begin <date>',
    'The begining date (and optionally time), inclusive, in ISO 8601 format.'
  ).addOption(new Option(
      '-e, --end <date>',
      'The ending date (and optionally time), exclusive, in ISO 8601 format. Default is now.'
    ).default((new Date()).toISOString())
  ).addOption(
    new Option(
      '-f, --format <format>',
      'output format'
    ).choices(['csv', 'json'])
    .default('csv')
  ).option(
    '-o, --overwrite',
    'Overwrite the output file. By default will not overwrite.'
  ).option(
    '-c, --conference',
    'Get conference call records. Default is SIP call records.'
  ).argument(
    '<filename>',
    'The name of the output file'
  )
  program.parse()
  const options = program.opts();

try {
  const getter = new CdrGetter(program.args[0], options);
  getter.get();
} catch (error) {
  console.error(error.message);
}