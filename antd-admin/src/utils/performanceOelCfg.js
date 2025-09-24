// 性能监控配置文件
export const peformanceCfg = {
  // 查询主机性能数据的 Elasticsearch DSL 模板
  queryHostPerformance: {
    query: {
      bool: {
        must: [
          // 时间范围、source、itemid 等条件将在运行时动态添加
        ]
      }
    },
    sort: [
      // 排序条件将在运行时动态添加
    ],
    from: 0,
    size: 10
  },

  // 查询 QPS 性能数据的 Elasticsearch DSL 模板
  queryQpsDetailsPerformance: {
    query: {
      bool: {
        must: [
          {
            range: {
              clock: {}
            }
          }
        ]
      }
    },
    size: 0,
    aggs: {
      group_by_device: {
        terms: {
          field: '',
          size: 0
        },
        aggs: {
          latest_info: {
            top_hits: {
              sort: [
                {
                  clock: {
                    order: 'asc'
                  }
                }
              ],
              _source: {
                includes: []
              },
              size: 1
            }
          },
          time_series: {
            histogram: {
              field: '',
              interval: 0,
              min_doc_count: 0
            },
            aggs: {
              values: {
                top_hits: {
                  sort: [
                    {
                      clock: {
                        order: 'asc'
                      }
                    }
                  ],
                  _source: {
                    includes: []
                  },
                  size: 100
                }
              }
            }
          }
        }
      }
    }
  },

  // 查询 QPS 性能数据的 Elasticsearch DSL 模板
  //   queryQpsAllPerformance: {
  //     query: {
  //       bool: {
  //         must: [
  //           {
  //             range: {
  //               clock: {}
  //             }
  //           }
  //         ]
  //       }
  //     },
  //     size: 0,
  //     aggs: {
  //       group_by_device: {
  //         terms: {
  //           field: '',
  //           size: 0
  //         },
  //         aggs: {
  //           latest_info: {
  //             top_hits: {
  //               sort: [
  //                 {
  //                   clock: {
  //                     order: 'desc'
  //                   }
  //                 }
  //               ],
  //               _source: {
  //                 includes: []
  //               },
  //               size: 1
  //             }
  //           },
  //           hostip_values: {
  //             terms: {
  //               field: '',
  //               size: 0
  //             },
  //             aggs: {
  //               value_stats: {
  //                 stats: {
  //                   field: 'value'
  //                 }
  //               },
  //               all_values: {
  //                 top_hits: {
  //                   sort: [
  //                     {
  //                       clock: {
  //                         order: 'asc'
  //                       }
  //                     }
  //                   ],
  //                   _source: {
  //                     includes: []
  //                   },
  //                   size: 0
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  queryQpsAllPerformance: {
    query: {
      bool: {
        must: [
          {
            range: {
              clock: {
                gte: 0,
                lte: 0
              }
            }
          },
          {
            term: {
              kpiname: ''
            }
          },
          {
            terms: {
              hostip: []
            }
          }
        ]
      }
    },
    size: 0,
    aggs: {
      group_by_device: {
        terms: {
          field: '',
          size: 0,
          order: {
            _key: 'asc'
          }
        },
        aggs: {
          latest_info: {
            top_hits: {
              sort: [
                {
                  clock: {
                    order: 'desc'
                  }
                }
              ],
              _source: {
                includes: []
              },
              size: 1
            }
          },
          hostip_values: {
            terms: {
              field: '',
              size: 0,
              order: {
                _key: 'asc'
              }
            },
            aggs: {
              all_values: {
                top_hits: {
                  sort: [
                    {
                      clock: {
                        order: 'asc'
                      }
                    }
                  ],
                  _source: {
                    includes: []
                  },
                  size: 100
                }
              }
            }
          },
          device_count: {
            cardinality: {
              field: ''
            }
          }
        }
      }
    }
  },

  // 查询角色详情 - 根据appcode查询该角色下所有设备IP的QPS数据
  queryRoleDetailPerformance: {
    query: {
      bool: {
        must: [
          {
            range: {
              clock: {
                gte: 0,
                lte: 0
              }
            }
          },
          {
            term: {
              appcode: ''
            }
          },
          {
            term: {
              kpiname: ''
            }
          }
        ]
      }
    },
    size: 0,
    aggs: {
      group_by_hostip: {
        terms: {
          field: 'hostip',
          size: 1000,
          order: {
            _key: 'asc'
          }
        },
        aggs: {
          latest_info: {
            top_hits: {
              sort: [
                {
                  clock: {
                    order: 'desc'
                  }
                }
              ],
              _source: {
                includes: []
              },
              size: 1
            }
          },
          time_series: {
            top_hits: {
              sort: [
                {
                  clock: {
                    order: 'asc'
                  }
                }
              ],
              _source: {
                includes: []
              },
              size: 100
            }
          }
        }
      }
    }
  },

  // 查询单个设备IP的详细数据 - 支持分页
  queryHostipDetailPerformance: {
    query: {
      bool: {
        must: [
          {
            range: {
              clock: {
                gte: 0,
                lte: 0
              }
            }
          },
          {
            term: {
              hostip: ''
            }
          },
          {
            term: {
              appcode: ''
            }
          },
          {
            term: {
              kpiname: ''
            }
          }
        ]
      }
    },
    sort: [
      {
        clock: {
          order: 'asc'
        }
      }
    ],
    from: 0,
    size: 100,
    _source: {
      includes: [
        'clock',
        'value',
        'hostip',
        'appcode',
        'vendor',
        'device',
        '@timestamp'
      ]
    }
  }
}
