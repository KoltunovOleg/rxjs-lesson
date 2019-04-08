import { from, fromEvent, Observable, of, interval, timer, merge,  concat} from 'rxjs';
import { map, 
  catchError, 
  debounceTime, 
  switchMap, 
  delay, 
  find, 
  scan, 
  filter, 
  pluck, 
  skip, 
  startWith, 
  take, 
  takeLast, 
  throttle, 
  concatAll,
  combineLatest
} from 'rxjs/operators';

const url: string = "https://rickandmortyapi.com/api/character";

const inputElement: HTMLInputElement = document.querySelector('#searchInput') as HTMLInputElement;
const checkboxElement1: HTMLElement = document.querySelector('#male') as HTMLElement;
const checkboxElement2: HTMLInputElement = document.querySelector('#female') as HTMLInputElement;

type IStreamOptions = { 
  'streamType': string,
  'streamValue': string | object,
  'sreamState'?: string
}


// Input's Observable
const source1$: Observable<any> = fromEvent(inputElement, 'input').pipe(
  map((event: Event) => {
    const item: IStreamOptions = {
      'streamType': (event.target as any).type,
      'streamValue': (event.target as any).value
    };
    return item;
  }),
  debounceTime(500)
);

// #male Checkbox's Observable
const source2$: Observable<any> = fromEvent(checkboxElement1, 'click').pipe(
  map((event: Event) => {
    const item: IStreamOptions = {
      'streamType': (event.target as any).type,
      'streamValue': (event.target as any).value,
      'sreamState': (event.target as any).checked
    };
    return item;
  }),
);

// #female Checkbox's Observable
const source3$: Observable<any> = fromEvent(checkboxElement2, 'click').pipe(
  map((event: Event) => {
    const item: IStreamOptions = {
      'streamType': (event.target as any).type,
      'streamValue': (event.target as any).value,
      'sreamState': (event.target as any).checked
    };
    return item;
  }),
);

// Cteation dinamic elements
const wrapperElement: HTMLElement = document.querySelector('.wrapper') as HTMLElement;
const listElement: HTMLElement = document.createElement('ul');

const pagination: HTMLElement = document.createElement('div');
const paginationList: HTMLElement = document.createElement('ul');
listElement.className = "list";
pagination.className = "pagination";

const paginationNext: HTMLElement = document.createElement('button');
paginationNext.innerHTML = "Next";
paginationNext.className = "next";

const paginationPrev: HTMLElement = document.createElement('button');
paginationPrev.innerHTML = "Prev";
paginationPrev.className = "prev";


wrapperElement.appendChild(listElement);
wrapperElement.appendChild(pagination);


const pagination$: Observable<any> = fromEvent(pagination, 'click').pipe(
  map((event: Event) => {
    const tegname: string = (event.target as any).tagName;
    if(tegname === "LI" || tegname === "BUTTON") {
      return (event.target as any).innerHTML;
    }
  })
);


// Filter's Observable
const filter$: Observable<any> = source1$.pipe(startWith(0)).pipe(combineLatest(
  source2$.pipe(startWith(0)),
  source3$.pipe(startWith(0))
))

let endpoint$: Observable<any> =  filter$.pipe(
  switchMap((value: any) => {
        let pointURL: string = "";
        const name: string = value[0]['streamValue'];
        const male: string = value[1]['streamValue'];
        const female: string = value[2]['streamValue'];
        const maleChecked: string = value[1]['sreamState'];
        const femaleChecked: string = value[2]['sreamState'];
          if(name) {
            pointURL = "?name=" + name;
          }

          if(maleChecked && !femaleChecked && name) {
            pointURL = pointURL + "&gender=" + male;
          } else if (!maleChecked && femaleChecked && name) {
            pointURL = pointURL + "&gender=" + female;
          } else if (maleChecked && !femaleChecked && !name) {
            pointURL = "?gender=" + male;
          } else if (!maleChecked && femaleChecked && !name) {
            pointURL = "?gender=" + female;
          }
        if(!pointURL) {
        return from(
          fetch(url)
          .then((res: Response) => res.json())
          .then((res: any) => {
            return [res,url];
          })
          .catch((err) => console.log(err))
        )
      } else {
        return from(
          fetch(url+pointURL)
          .then((res: Response) => res.json())
          .then((res: any) => {
            return [res, url+pointURL];
          })
          .catch((err) => console.log(err))
        )
      }
    }),
    catchError((err: Error, caught: any) => {
      return of(err)
    })
);


// Get page info
let renderList: any = "";
const getPage$: Observable<any> = merge(
  endpoint$,
  pagination$.pipe(startWith(""))
).pipe(
  switchMap((value: any) => {
    let page: string = '';

    if(value && value == "Next" && renderList[0].info.next) {
      page = value;
      return from(
        fetch(renderList[0].info.next)
        .then((res: Response) => res.json())
        .then((res: any) => {
          renderList = [res, renderList[1]];
          return res;
        })
        .catch((err) => console.log(err))
      );
    } else  if(value && value == "Prev" && renderList[0].info.prev) {
      page = value;
      return from(
        fetch(renderList[0].info.prev)
        .then((res: Response) => res.json())
        .then((res: any) => {
          renderList = [res, renderList[1]];
          return res;
        })
        .catch((err) => console.log(err))
      );
    } else if(value && typeof value === "string") {
      const endCurrentUrl = renderList[1].substr(url.length+1);
      const nextUrl = url + "/?page=" + value + "&" + endCurrentUrl;
      return from(
        fetch(nextUrl)
        .then((res: Response) => res.json())
        .then((res: any) => {
          renderList = [res, renderList[1]];
          return res;
        })
        .catch((err) => console.log(err))
      );
    }else if (value && typeof value === "object") {
      renderList = value;
      return of(value[0]);
    } else {
      return of(renderList[0]);
    }
  })
);


getPage$.subscribe((val: any) => {
  listElement.innerHTML = '';

  if(!val) {
    listElement.innerHTML = 'Loading...'
  }else if(val && !val.error) {
      val.results.forEach((item: any) => {
        const li: HTMLElement = document.createElement('li');
        li.innerHTML = item.name;
        listElement.appendChild(li)
      })
    } else if (val.error) {
      listElement.innerHTML = 'Try other name';
    }
  },
  (err: Error) => {
    console.log(err);
  }
);

// Render pagination
//
getPage$.subscribe((val:any) => {
  let pageAmount:number = 0;
  
  if ( val && !val.error) {
    pageAmount = val.info.pages;
  }

  if(pageAmount > 1 ) {
    const pageInfo: any = val.info;
    pagination.appendChild(paginationPrev);
    pagination.appendChild(paginationList);
    pagination.appendChild(paginationNext);
    FillPaginationList (pageAmount, pageInfo);
  } else {
    pagination.innerHTML = '';
  }
});


function FillPaginationList (pages:number, pageInfo: any) {
  let prev: number;
  if(pageInfo.prev) {
    prev = Number(pageInfo.prev.match(/\d+/g).join(""));
  } else {
    prev = 1;
  }
  paginationList.innerHTML = '';
  for (let i = prev; i <= pages; i++) {
    const li: HTMLElement = document.createElement('li');
    li.innerHTML = `${i}`;
    paginationList.appendChild(li);
    if(i >= prev+2) {
      break;
    }
  }
}


//
const card: HTMLElement = document.querySelector('.card') as HTMLElement;
const heroName: HTMLElement = document.createElement('div');
const heroUrl: HTMLElement = document.createElement('div');
const heroType: HTMLElement = document.createElement('div');
const heroDimension: HTMLElement = document.createElement('div');

const getHeroCard$: Observable<any> = fromEvent(listElement, 'click').pipe(
  map((event: Event) => (event.target as any).innerHTML),
  switchMap((value: any) => {
    return from(
      fetch(url+"/?name="+ value)
      .then((res: Response) => res.json())
      .then((res: any) => {
        return res;
      })
      .catch((err) => console.log(err))
    )
  })
);

getHeroCard$.subscribe((val:any) => {
  card.innerHTML = '';

  card.appendChild(heroName);
  card.appendChild(heroUrl);
  card.appendChild(heroType);
  card.appendChild(heroDimension);

  val.results.forEach((item:any) => {
    heroName.innerHTML= item.name;
    heroUrl.innerHTML="Hero url: "+ item.url;
    heroType.innerHTML="Hero type: "+ item.type;
    heroDimension.innerHTML="Hero dimension: "+ item.location.name;
    if(item.episode) {
      getEposodes(item.episode);
    }
  })


});

function getEposodes(episodes: []) {
  const heroEpisodes: HTMLElement = document.createElement('ul');
  card.appendChild(heroEpisodes);
  
  episodes.forEach((item:string) => {
    const heroEpisodeItem: HTMLElement = document.createElement('li');
    heroEpisodeItem.innerHTML=item;
    heroEpisodes.appendChild(heroEpisodeItem);
  })
}
