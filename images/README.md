# images — 원본 이미지 보관 (배포되지 않음)

사이트에는 이 폴더가 올라가지 않습니다. 사이트에서 쓰는 웹용 파일은 `assets/img/` 에 있습니다.
폴더 번호는 초대장 순서(공연 → 작곡가 → 시각예술 → 연주자)를 따릅니다.

```
1_공연/        공연 포스터, 에필로그(나눔) 이미지
2_작곡가/      작곡가 사진
3_시각예술/    시각예술 작가 사진
4_연주자/
  프로필/      여러 연주자가 한 장에 든 프로필 이미지 (번호 = 프로그램 순서)
  사진/        연주자 1인 원본 사진 (파일 이름: 이름_악기)
```

새 자료를 받으면 위 분류에 맞는 폴더에 `이름_악기.jpg` 처럼 이름을 붙여 넣습니다.

## 원본 → 웹용 파일 대응

연주자 사진은 `tools/photo.py` 로 만듭니다. 다시 만들 때 아래 옵션을 그대로 쓰면 같은 결과가 나옵니다.
(이미 배포된 사진을 바꿀 때는 캐시 때문에 새 이름(`…-v2`)으로 만드세요.)

| 원본 | 웹용 (`assets/img/`) | 옵션 |
|---|---|---|
| `1_공연/공연포스터.png` | `poster-212.jpg` | |
| `1_공연/에필로그_나눔(남김말).png` | `epilogue-nanum.jpg` | |
| `2_작곡가/이원희_작곡가.jpg` | `composer-lee-wonhee.jpg` | |
| `3_시각예술/임채은_시각예술.png` | `artist-lim-chaeeun.jpg` | |
| `4_연주자/프로필/1_피아노트리오_…png` | `performer-yu-junghoon-hq.jpg` | `--crop 61,126,197,292` ※ |
| 〃 | `performer-kim-sinseok-hq.jpg` | `--crop 61,372,197,529` ※ |
| 〃 | `performer-park-jieun-hq.jpg` | `--crop 61,609,197,768` ※ |
| `4_연주자/사진/최상미_피아노.jpg` | `performer-choi-sangmi.jpg` | `--bright 0.97 --warm 1.015` |
| `4_연주자/사진/안성준_트럼펫.jpg` | `performer-ahn-seongjun.jpg` | `--bright 0.98 --warm 1.0` |
| `4_연주자/사진/김동우_테너.jpg` | `performer-kim-dongwoo.jpg` | |
| `4_연주자/사진/조재량_피아노.jpg` | `performer-jo-jaeryang.jpg` | `--crop 1200,0,6133,5333` (가로 사진 → 세로) |
| `4_연주자/사진/하정화_바이올린I.jpg` | `performer-ha-jeonghwa.jpg` | |
| `4_연주자/사진/김수지_바이올린II.jpg` | `performer-kim-suji.jpg` | |
| `4_연주자/사진/황정은_비올라.jpg` | `performer-hwang-jeongeun.jpg` | `--crop 600,0,3000,3600` (상반신) |
| `4_연주자/사진/박수미_첼로.jpg` | `performer-park-sumi.jpg` | `--crop 180,0,790,693` (가로 사진 → 세로) |

※ 피아노 트리오 3인은 원본 사진이 없어 프로필 이미지에서 잘라 쓴 것입니다(화질 한계).
  `tools/photo.py` 이전의 보정 설정이라 다시 만들면 약간 다를 수 있습니다. 원본 사진을 받으면 `사진/` 에 넣고 교체하세요.
